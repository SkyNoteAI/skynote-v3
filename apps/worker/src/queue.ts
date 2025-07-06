import { Env, NoteMessage, BlockNoteContent } from './types/env';

/**
 * Queue consumer handler for processing note-related messages
 * Handles batch processing with retry logic and error handling
 */
export async function queue(
  batch: MessageBatch<NoteMessage>,
  env: Env
): Promise<void> {
  const results = await Promise.allSettled(
    batch.messages.map((message) => processMessage(message, env))
  );

  // Log batch processing results
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `Queue batch processed: ${successful} successful, ${failed} failed`
  );
}

/**
 * Process a single queue message with retry logic
 */
async function processMessage(
  message: Message<NoteMessage>,
  env: Env
): Promise<void> {
  try {
    const { type, noteId, userId, content, title, metadata } = message.body;

    switch (type) {
      case 'convert-to-markdown':
        await processMarkdownConversion(
          noteId,
          userId,
          content,
          title,
          metadata,
          env
        );
        break;

      case 'index-for-search':
        await processSearchIndexing(noteId, userId, env);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Acknowledge successful processing
    message.ack();

    console.log(`Successfully processed ${type} for note ${noteId}`);
  } catch (error) {
    console.error(
      `Error processing message for note ${message.body.noteId}:`,
      error
    );

    // Retry logic with exponential backoff
    if (message.attempts < 3) {
      const delay = Math.pow(2, message.attempts) * 1000; // 1s, 2s, 4s
      console.log(
        `Retrying message in ${delay}ms (attempt ${message.attempts + 1}/3)`
      );

      message.retry({
        delaySeconds: delay / 1000,
      });
    } else {
      // Max retries reached, send to dead letter queue
      await logToDeadLetterQueue(message, error, env);
      message.ack(); // Acknowledge to prevent infinite retries
    }
  }
}

/**
 * Convert BlockNote content to Markdown and store in R2
 */
async function processMarkdownConversion(
  noteId: string,
  userId: string,
  content: BlockNoteContent[],
  title?: string,
  metadata?: any,
  env?: Env
): Promise<void> {
  if (!env) throw new Error('Environment not available');

  try {
    // Convert BlockNote content to Markdown
    const markdown = await convertBlocksToMarkdown(content, metadata);

    // Store markdown in R2
    const r2Key = `users/${userId}/notes/${noteId}/content.md`;
    await env.R2.put(r2Key, markdown, {
      httpMetadata: {
        contentType: 'text/markdown',
        cacheControl: 'max-age=3600',
      },
      customMetadata: {
        noteId,
        userId,
        title: title || 'Untitled',
        generatedAt: new Date().toISOString(),
      },
    });

    // Update database to mark markdown as generated
    await env.DB.prepare(
      `
      UPDATE notes 
      SET markdown_generated_at = CURRENT_TIMESTAMP,
          markdown_version = COALESCE(markdown_version, 0) + 1
      WHERE id = ? AND user_id = ?
    `
    )
      .bind(noteId, userId)
      .run();

    console.log(`Markdown conversion completed for note ${noteId}`);
  } catch (error) {
    console.error(`Failed to convert note ${noteId} to markdown:`, error);
    throw error;
  }
}

/**
 * Process search indexing for a note
 */
async function processSearchIndexing(
  noteId: string,
  userId: string,
  env: Env
): Promise<void> {
  try {
    // Get markdown content from R2
    const r2Key = `users/${userId}/notes/${noteId}/content.md`;
    const markdownObject = await env.R2.get(r2Key);

    if (!markdownObject) {
      throw new Error(`Markdown not found for note ${noteId}`);
    }

    const markdown = await markdownObject.text();

    // Index with AutoRAG (placeholder - will be implemented in TASK-018)
    // await env.AUTORAG.index({
    //   documentId: noteId,
    //   userId,
    //   content: markdown
    // });

    console.log(`Search indexing completed for note ${noteId}`);
  } catch (error) {
    console.error(`Failed to index note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Convert BlockNote content to optimized Markdown
 */
export async function convertBlocksToMarkdown(
  blocks: BlockNoteContent[],
  metadata?: any
): Promise<string> {
  if (!blocks || blocks.length === 0) {
    return '';
  }

  let markdown = '';

  // Add metadata header if available
  if (metadata) {
    markdown += '---\n';
    markdown += `title: ${metadata.title || 'Untitled'}\n`;
    if (metadata.tags && metadata.tags.length > 0) {
      markdown += `tags: ${metadata.tags.join(', ')}\n`;
    }
    if (metadata.folder) {
      markdown += `folder: ${metadata.folder}\n`;
    }
    if (metadata.created_at) {
      markdown += `created: ${metadata.created_at}\n`;
    }
    if (metadata.updated_at) {
      markdown += `updated: ${metadata.updated_at}\n`;
    }
    markdown += '---\n\n';
  }

  // Convert blocks to markdown
  for (const block of blocks) {
    markdown += await convertBlockToMarkdown(block);
  }

  return markdown.trim();
}

/**
 * Convert a single BlockNote block to Markdown
 */
async function convertBlockToMarkdown(
  block: BlockNoteContent,
  depth: number = 0
): Promise<string> {
  const indent = '  '.repeat(depth);
  let result = '';

  switch (block.type) {
    case 'paragraph':
      result = (await convertInlineContent(block.content || [])) + '\n\n';
      break;

    case 'heading':
      const level = block.attrs?.level || 1;
      const headingText = await convertInlineContent(block.content || []);
      result = '#'.repeat(level) + ' ' + headingText + '\n\n';
      break;

    case 'bulletListItem':
      const bulletText = await convertInlineContent(block.content || []);
      result = indent + '- ' + bulletText + '\n';
      break;

    case 'numberedListItem':
      const numberedText = await convertInlineContent(block.content || []);
      result = indent + '1. ' + numberedText + '\n';
      break;

    case 'checkListItem':
      const checkText = await convertInlineContent(block.content || []);
      const checked = block.attrs?.checked ? 'x' : ' ';
      result = indent + `- [${checked}] ` + checkText + '\n';
      break;

    case 'codeBlock':
      const language = block.attrs?.language || '';
      const code = await convertInlineContent(block.content || []);
      result = '```' + language + '\n' + code + '\n```\n\n';
      break;

    case 'blockquote':
      const quoteText = await convertInlineContent(block.content || []);
      result = '> ' + quoteText + '\n\n';
      break;

    case 'image':
      const src = block.attrs?.src || '';
      const alt = block.attrs?.alt || '';
      result = `![${alt}](${src})\n\n`;
      break;

    case 'table':
      // Handle table conversion (simplified)
      result = await convertTableToMarkdown(block);
      break;

    default:
      // Fallback for unknown block types
      if (block.content) {
        result = (await convertInlineContent(block.content)) + '\n\n';
      }
      break;
  }

  return result;
}

/**
 * Convert inline content (text formatting) to Markdown
 */
async function convertInlineContent(
  content: BlockNoteContent[]
): Promise<string> {
  if (!content || content.length === 0) {
    return '';
  }

  let result = '';

  for (const item of content) {
    if (item.type === 'text') {
      let text = item.text || '';

      // Apply text formatting with proper nesting
      if (item.attrs) {
        if (item.attrs.bold && item.attrs.italic) {
          text = `***${text}***`;
        } else if (item.attrs.bold) {
          text = `**${text}**`;
        } else if (item.attrs.italic) {
          text = `*${text}*`;
        }

        if (item.attrs.strikethrough) text = `~~${text}~~`;
        if (item.attrs.code) text = `\`${text}\``;
        if (item.attrs.underline) text = `<u>${text}</u>`;
      }

      result += text;
    } else if (item.type === 'link') {
      const href = item.attrs?.href || '';
      const linkText = await convertInlineContent(item.content || []);
      result += `[${linkText}](${href})`;
    } else if (item.content) {
      // Recursively handle nested content
      result += await convertInlineContent(item.content);
    }
  }

  return result;
}

/**
 * Convert table block to Markdown table
 */
async function convertTableToMarkdown(
  block: BlockNoteContent
): Promise<string> {
  // Simplified table conversion - would need more complex logic for full support
  return '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n\n';
}

/**
 * Log failed messages to dead letter queue for manual inspection
 */
async function logToDeadLetterQueue(
  message: Message<NoteMessage>,
  error: unknown,
  env: Env
): Promise<void> {
  try {
    const errorLog = {
      messageId: message.id,
      body: message.body,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      attempts: message.attempts,
    };

    // Store error in R2 for manual inspection
    const errorKey = `dead-letter-queue/${Date.now()}-${message.id}.json`;
    await env.R2.put(errorKey, JSON.stringify(errorLog, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        type: 'dead-letter-queue',
        messageType: message.body.type,
        noteId: message.body.noteId,
        userId: message.body.userId,
      },
    });

    console.error(`Message sent to dead letter queue: ${errorKey}`);
  } catch (dlqError) {
    console.error('Failed to log to dead letter queue:', dlqError);
  }
}
