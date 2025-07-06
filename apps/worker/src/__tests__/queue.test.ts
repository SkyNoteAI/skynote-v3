import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queue, convertBlocksToMarkdown } from '../queue';
import { Env, NoteMessage, BlockNoteContent } from '../types/env';

// Mock environment
const mockEnv: Env = {
  DB: {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
  } as any,
  R2: {
    put: vi.fn(),
    get: vi.fn(),
  } as any,
  NOTE_QUEUE: {} as any,
  AI: {} as any,
  AUTORAG: {
    search: vi.fn(),
    getContext: vi.fn(),
  },
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'test',
  RATE_LIMITER: {} as any,
};

// Mock message
const createMockMessage = (
  body: NoteMessage,
  attempts = 1
): Message<NoteMessage> => ({
  id: 'test-message-id',
  body,
  attempts,
  ack: vi.fn(),
  retry: vi.fn(),
  timestamp: new Date(),
});

// Mock batch
const createMockBatch = (
  messages: Message<NoteMessage>[]
): MessageBatch<NoteMessage> => ({
  messages,
  queue: 'test-queue',
  retryAll: vi.fn(),
  ackAll: vi.fn(),
});

describe('Queue Consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.log/error mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('queue handler', () => {
    it('should process a batch of messages successfully', async () => {
      const message1 = createMockMessage({
        type: 'convert-to-markdown',
        noteId: 'note-1',
        userId: 'user-1',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        ],
      });

      const message2 = createMockMessage({
        type: 'convert-to-markdown',
        noteId: 'note-2',
        userId: 'user-2',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
        ],
      });

      const batch = createMockBatch([message1, message2]);

      await queue(batch, mockEnv);

      expect(message1.ack).toHaveBeenCalled();
      expect(message2.ack).toHaveBeenCalled();
      expect(mockEnv.R2.put).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        'Queue batch processed: 2 successful, 0 failed'
      );
    });

    it('should handle message processing failures', async () => {
      // Mock R2.put to throw error
      mockEnv.R2.put = vi.fn().mockRejectedValue(new Error('R2 error'));

      const message = createMockMessage(
        {
          type: 'convert-to-markdown',
          noteId: 'note-1',
          userId: 'user-1',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
          ],
        },
        1
      ); // First attempt

      const batch = createMockBatch([message]);

      await queue(batch, mockEnv);

      expect(message.retry).toHaveBeenCalled();
      expect(message.ack).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Retrying message in')
      );
    });

    it('should send message to dead letter queue after max retries', async () => {
      // Mock R2.put to throw error for main processing but succeed for DLQ
      mockEnv.R2.put = vi
        .fn()
        .mockRejectedValueOnce(new Error('R2 error'))
        .mockResolvedValueOnce(undefined); // For DLQ

      const message = createMockMessage(
        {
          type: 'convert-to-markdown',
          noteId: 'note-1',
          userId: 'user-1',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
          ],
        },
        3
      ); // Max attempts reached

      const batch = createMockBatch([message]);

      await queue(batch, mockEnv);

      expect(message.ack).toHaveBeenCalled(); // Should ack after DLQ
      expect(mockEnv.R2.put).toHaveBeenCalledTimes(2); // Once for processing (failed), once for DLQ
    });
  });

  describe('convertBlocksToMarkdown', () => {
    it('should convert simple paragraph to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world!' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('Hello world!');
    });

    it('should convert headings to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Main Title' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Subtitle' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('# Main Title\n\n## Subtitle');
    });

    it('should convert bullet lists to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'First item' }],
        },
        {
          type: 'bulletListItem',
          content: [{ type: 'text', text: 'Second item' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('- First item\n- Second item');
    });

    it('should convert numbered lists to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'First item' }],
        },
        {
          type: 'numberedListItem',
          content: [{ type: 'text', text: 'Second item' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('1. First item\n1. Second item');
    });

    it('should convert checklists to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'checkListItem',
          attrs: { checked: true },
          content: [{ type: 'text', text: 'Completed task' }],
        },
        {
          type: 'checkListItem',
          attrs: { checked: false },
          content: [{ type: 'text', text: 'Pending task' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('- [x] Completed task\n- [ ] Pending task');
    });

    it('should convert code blocks to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: 'console.log("Hello world!");' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('```javascript\nconsole.log("Hello world!");\n```');
    });

    it('should convert blockquotes to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'blockquote',
          content: [{ type: 'text', text: 'This is a quote' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('> This is a quote');
    });

    it('should convert images to markdown', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'image',
          attrs: {
            src: 'https://example.com/image.jpg',
            alt: 'Example image',
          },
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('![Example image](https://example.com/image.jpg)');
    });

    it('should handle text formatting', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold text', attrs: { bold: true } },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic text', attrs: { italic: true } },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'code text', attrs: { code: true } },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('**Bold text** and *italic text* and `code text`');
    });

    it('should handle links', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'link',
              attrs: { href: 'https://example.com' },
              content: [{ type: 'text', text: 'this link' }],
            },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('Visit [this link](https://example.com)');
    });

    it('should include metadata header when provided', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Content' }],
        },
      ];

      const metadata = {
        title: 'Test Note',
        tags: ['test', 'markdown'],
        folder: 'personal',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      const markdown = await convertBlocksToMarkdown(blocks, metadata);

      expect(markdown).toContain('---');
      expect(markdown).toContain('title: Test Note');
      expect(markdown).toContain('tags: test, markdown');
      expect(markdown).toContain('folder: personal');
      expect(markdown).toContain('created: 2024-01-01T00:00:00Z');
      expect(markdown).toContain('updated: 2024-01-01T01:00:00Z');
      expect(markdown).toContain('Content');
    });

    it('should handle empty content', async () => {
      const markdown = await convertBlocksToMarkdown([]);
      expect(markdown).toBe('');
    });

    it('should handle unknown block types gracefully', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'unknown-block-type',
          content: [{ type: 'text', text: 'Unknown content' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('Unknown content');
    });
  });

  describe('markdown conversion edge cases', () => {
    it('should handle nested content structures', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Bold and italic',
              attrs: { bold: true, italic: true },
            },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('***Bold and italic***');
    });

    it('should handle strikethrough text', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Strikethrough text',
              attrs: { strikethrough: true },
            },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('~~Strikethrough text~~');
    });

    it('should handle underlined text', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Underlined text',
              attrs: { underline: true },
            },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('<u>Underlined text</u>');
    });

    it('should handle code blocks without language', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('```\nconst x = 1;\n```');
    });

    it('should handle images without alt text', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'image',
          attrs: {
            src: 'https://example.com/image.jpg',
          },
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe('![](https://example.com/image.jpg)');
    });
  });

  describe('performance tests', () => {
    it('should process large documents efficiently', async () => {
      const largeBlocks: BlockNoteContent[] = [];

      // Create 1000 paragraphs
      for (let i = 0; i < 1000; i++) {
        largeBlocks.push({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `This is paragraph ${i + 1} with some content.`,
            },
          ],
        });
      }

      const startTime = Date.now();
      const markdown = await convertBlocksToMarkdown(largeBlocks);
      const endTime = Date.now();

      expect(markdown.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle deeply nested structures', async () => {
      const blocks: BlockNoteContent[] = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Link with ',
              attrs: { bold: true },
            },
            {
              type: 'link',
              attrs: { href: 'https://example.com' },
              content: [
                {
                  type: 'text',
                  text: 'nested bold text',
                  attrs: { bold: true },
                },
              ],
            },
          ],
        },
      ];

      const markdown = await convertBlocksToMarkdown(blocks);
      expect(markdown).toBe(
        '**Link with **[**nested bold text**](https://example.com)'
      );
    });
  });
});
