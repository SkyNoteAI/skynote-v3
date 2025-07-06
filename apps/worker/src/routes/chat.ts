import { Hono } from 'hono';
import type { Env } from '../types/env';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { AutoRAGService } from '../services/autorag';
import { rateLimit, rateLimitConfigs } from '../middleware/rateLimit';

const chatRouter = new Hono<{ Bindings: Env }>();

// Schema for chat request
const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context_limit: z.number().int().min(1).max(10).optional().default(5),
  stream: z.boolean().optional().default(false),
  conversation_id: z.string().optional(),
});

// Schema for chat messages stored in DB (for future use)
// const chatMessageSchema = z.object({
//   role: z.enum(['user', 'assistant', 'system']),
//   content: z.string(),
//   timestamp: z.string(),
//   sources: z
//     .array(
//       z.object({
//         noteId: z.string(),
//         title: z.string(),
//         excerpt: z.string(),
//         relevance: z.number(),
//       })
//     )
//     .optional(),
// });

// Helper function to format prompt with context
function formatPromptWithContext(
  message: string,
  context: { sources?: Array<{ title: string; excerpt: string }> }
): string {
  if (!context || !context.sources || context.sources.length === 0) {
    return message;
  }

  const contextText = context.sources
    .map((source, index: number) => {
      return `[${index + 1}] ${source.title}\n${source.excerpt}`;
    })
    .join('\n\n');

  return `Context from user's notes:\n\n${contextText}\n\nUser question: ${message}`;
}

// Helper function to extract sources from AutoRAG context
function extractSources(context: {
  sources?: Array<{
    id: string;
    title?: string;
    excerpt?: string;
    score?: number;
  }>;
}): Array<{
  noteId: string;
  title: string;
  excerpt: string;
  relevance: number;
}> {
  if (!context || !context.sources) return [];

  return context.sources.map((source) => ({
    noteId: source.id,
    title: source.title || 'Untitled',
    excerpt: source.excerpt || '',
    relevance: source.score || 0,
  }));
}

// POST /api/chat - Send a message and get AI response
chatRouter.post(
  '/',
  rateLimit(rateLimitConfigs.aiChat),
  validateRequest(chatRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const { message, context_limit, stream, conversation_id } =
      c.req.valid('json');

    try {
      // Get relevant context via AutoRAG service
      const autoragService = new AutoRAGService(c.env);
      const context = await autoragService.getContext({
        query: message,
        limit: context_limit,
        userId,
      });

      // Prepare messages for AI
      const systemPrompt = `You are a helpful AI assistant with access to the user's personal notes. 
When answering questions, use the provided context from their notes to give accurate and personalized responses. 
If the context doesn't contain relevant information, you can provide general knowledge but mention that you couldn't find specific information in their notes.
Always be concise and helpful.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: formatPromptWithContext(message, context) },
      ];

      // Generate response using Workers AI
      const aiResponse = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages,
        max_tokens: 512,
        temperature: 0.7,
        stream: stream,
      });

      // Extract sources for citation
      const sources = extractSources(context);

      // Store chat message in history
      const conversationId = conversation_id || crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Store user message
      await c.env.DB.prepare(
        `
      INSERT INTO chat_history (id, user_id, conversation_id, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
        .bind(
          crypto.randomUUID(),
          userId,
          conversationId,
          'user',
          message,
          timestamp
        )
        .run();

      // Handle streaming response
      if (stream) {
        // For streaming, we need to handle it differently
        // This is a simplified version - in production you'd use Server-Sent Events
        return c.json({
          success: true,
          data: {
            conversation_id: conversationId,
            response: aiResponse.response,
            sources,
            stream: true,
          },
        });
      }

      // Store assistant response
      const assistantMessageId = crypto.randomUUID();
      await c.env.DB.prepare(
        `
      INSERT INTO chat_history (id, user_id, conversation_id, role, content, timestamp, sources)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
        .bind(
          assistantMessageId,
          userId,
          conversationId,
          'assistant',
          aiResponse.response,
          new Date().toISOString(),
          JSON.stringify(sources)
        )
        .run();

      // Track token usage
      if (aiResponse.usage) {
        await c.env.DB.prepare(
          `
        INSERT INTO ai_usage (id, user_id, timestamp, tokens_used, model, endpoint)
        VALUES (?, ?, ?, ?, ?, ?)
      `
        )
          .bind(
            crypto.randomUUID(),
            userId,
            timestamp,
            aiResponse.usage.total_tokens || 0,
            '@cf/meta/llama-2-7b-chat-int8',
            'chat'
          )
          .run();
      }

      return c.json({
        success: true,
        data: {
          conversation_id: conversationId,
          response: aiResponse.response,
          sources,
          usage: aiResponse.usage,
        },
      });
    } catch (error) {
      console.error('Chat API error:', error);

      // Handle specific AI service errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return c.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message:
                  'AI service rate limit exceeded. Please try again later.',
              },
            },
            429
          );
        }

        if (
          error.message.includes('context') ||
          error.message.includes('AutoRAG')
        ) {
          return c.json(
            {
              success: false,
              error: {
                code: 'CONTEXT_RETRIEVAL_FAILED',
                message:
                  'Failed to retrieve context from your notes. Please try again.',
              },
            },
            503
          );
        }
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_ERROR',
            message:
              'AI service is temporarily unavailable. Please try again later.',
          },
        },
        503
      );
    }
  }
);

// GET /api/chat/history - Get chat history for a user
chatRouter.get('/history', async (c) => {
  const userId = c.get('userId');
  const conversationId = c.req.query('conversation_id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    let query = `
      SELECT id, conversation_id, role, content, timestamp, sources
      FROM chat_history
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (conversationId) {
      query += ' AND conversation_id = ?';
      params.push(conversationId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query)
      .bind(...params)
      .all();

    // Parse sources JSON for assistant messages
    const messages = result.results.map((msg: any) => ({
      ...msg,
      sources: msg.sources ? JSON.parse(msg.sources) : undefined,
    }));

    return c.json({
      success: true,
      data: {
        messages,
        pagination: {
          limit,
          offset,
          total: result.results.length,
        },
      },
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'HISTORY_FETCH_ERROR',
          message: 'Failed to fetch chat history',
        },
      },
      500
    );
  }
});

// GET /api/chat/conversations - Get list of conversations
chatRouter.get('/conversations', async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const result = await c.env.DB.prepare(
      `
      SELECT 
        conversation_id,
        MIN(timestamp) as started_at,
        MAX(timestamp) as last_message_at,
        COUNT(*) as message_count,
        (
          SELECT content 
          FROM chat_history ch2 
          WHERE ch2.conversation_id = ch.conversation_id 
            AND ch2.role = 'user' 
          ORDER BY timestamp ASC 
          LIMIT 1
        ) as first_message
      FROM chat_history ch
      WHERE user_id = ?
      GROUP BY conversation_id
      ORDER BY last_message_at DESC
      LIMIT ? OFFSET ?
    `
    )
      .bind(userId, limit, offset)
      .all();

    return c.json({
      success: true,
      data: {
        conversations: result.results,
        pagination: {
          limit,
          offset,
          total: result.results.length,
        },
      },
    });
  } catch (error) {
    console.error('Conversations list error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CONVERSATIONS_FETCH_ERROR',
          message: 'Failed to fetch conversations',
        },
      },
      500
    );
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
chatRouter.delete('/conversations/:id', async (c) => {
  const userId = c.get('userId');
  const conversationId = c.req.param('id');

  try {
    // Verify the conversation belongs to the user
    const verification = await c.env.DB.prepare(
      `
      SELECT COUNT(*) as count
      FROM chat_history
      WHERE user_id = ? AND conversation_id = ?
    `
    )
      .bind(userId, conversationId)
      .first();

    if (!verification || verification.count === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        404
      );
    }

    // Delete all messages in the conversation
    await c.env.DB.prepare(
      `
      DELETE FROM chat_history
      WHERE user_id = ? AND conversation_id = ?
    `
    )
      .bind(userId, conversationId)
      .run();

    return c.json({
      success: true,
      data: {
        conversation_id: conversationId,
        deleted: true,
      },
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'CONVERSATION_DELETE_ERROR',
          message: 'Failed to delete conversation',
        },
      },
      500
    );
  }
});

export { chatRouter };
