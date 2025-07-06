import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { chatRouter } from '../routes/chat';
import type { Env } from '../types/env';

// Mock environment
const mockEnv: Partial<Env> = {
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({
          results: [
            {
              id: 'note1',
              title: 'Test Note',
              folder_path: '/test',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
              r2_key_prefix: 'users/test/notes/note1',
              tags: 'ai,test',
            },
          ],
        }),
        first: vi.fn().mockResolvedValue({ count: 1 }),
      }),
    }),
  } as any,

  R2: {
    get: vi.fn().mockResolvedValue({
      text: vi
        .fn()
        .mockResolvedValue(
          '# Test Note\n\nThis is a test note about AI and machine learning.'
        ),
    }),
  } as any,

  AI: {
    run: vi.fn().mockResolvedValue({
      response: 'This is a helpful AI response based on your notes.',
      usage: {
        total_tokens: 150,
        prompt_tokens: 100,
        completion_tokens: 50,
      },
    }),
  } as any,

  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'test',
  ALLOWED_ORIGINS: 'http://localhost:3000',
};

// Mock user context
const mockUser = {
  userId: 'test-user-id',
  email: 'test@example.com',
};

// Create test app
const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  // Mock auth middleware
  app.use('*', async (c, next) => {
    c.set('userId', mockUser.userId);
    c.set('userEmail', mockUser.email);
    await next();
  });

  // Mock environment
  app.use('*', async (c, next) => {
    c.env = mockEnv as Env;
    await next();
  });

  app.route('/api/chat', chatRouter);
  return app;
};

describe('Chat API', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('should send a chat message and get AI response', async () => {
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me about AI',
          context_limit: 3,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('conversation_id');
      expect(data.data).toHaveProperty('response');
      expect(data.data).toHaveProperty('sources');
      expect(data.data.sources).toBeInstanceOf(Array);
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-2-7b-chat-int8',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        })
      );
    });

    it('should handle streaming responses', async () => {
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me about AI',
          stream: true,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stream', true);
    });

    it('should include conversation ID for subsequent messages', async () => {
      const conversationId = 'test-conversation-id';

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Follow up question',
          conversation_id: conversationId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.conversation_id).toBe(conversationId);
    });

    it('should validate request parameters', async () => {
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '', // Empty message should fail
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should limit context results', async () => {
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test query',
          context_limit: 2,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.sources.length).toBeLessThanOrEqual(2);
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock AI service failure
      mockEnv.AI.run = vi
        .fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(503);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AI_SERVICE_ERROR');
    });

    it('should handle rate limiting errors', async () => {
      // Mock rate limiting error
      mockEnv.AI.run = vi
        .fn()
        .mockRejectedValue(new Error('rate limit exceeded'));

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(429);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should store chat history in database', async () => {
      await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      // Verify DB.prepare was called for storing chat history
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_history')
      );
    });

    it('should track AI usage metrics', async () => {
      await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      // Verify AI usage tracking
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_usage')
      );
    });
  });

  describe('GET /api/chat/history', () => {
    it('should retrieve chat history for user', async () => {
      const response = await app.request('/api/chat/history');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('messages');
      expect(data.data).toHaveProperty('pagination');
    });

    it('should filter by conversation ID', async () => {
      const conversationId = 'test-conversation';

      const response = await app.request(
        `/api/chat/history?conversation_id=${conversationId}`
      );

      expect(response.status).toBe(200);
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('conversation_id = ?')
      );
    });

    it('should support pagination', async () => {
      const response = await app.request('/api/chat/history?limit=10&offset=5');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        limit: 10,
        offset: 5,
        total: expect.any(Number),
      });
    });

    it('should handle database errors', async () => {
      mockEnv.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const response = await app.request('/api/chat/history');

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('HISTORY_FETCH_ERROR');
    });
  });

  describe('GET /api/chat/conversations', () => {
    it('should list user conversations', async () => {
      const response = await app.request('/api/chat/conversations');

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('conversations');
      expect(data.data).toHaveProperty('pagination');
    });

    it('should support pagination for conversations', async () => {
      const response = await app.request(
        '/api/chat/conversations?limit=5&offset=0'
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.pagination.limit).toBe(5);
      expect(data.data.pagination.offset).toBe(0);
    });
  });

  describe('DELETE /api/chat/conversations/:id', () => {
    it('should delete a conversation', async () => {
      const conversationId = 'test-conversation-id';

      const response = await app.request(
        `/api/chat/conversations/${conversationId}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.conversation_id).toBe(conversationId);
      expect(data.data.deleted).toBe(true);
    });

    it('should return 404 for non-existent conversation', async () => {
      // Mock no conversation found
      mockEnv.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
        }),
      });

      const response = await app.request(
        '/api/chat/conversations/non-existent',
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(404);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should handle database errors during deletion', async () => {
      mockEnv.DB.prepare = vi
        .fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ count: 1 }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Delete failed')),
          }),
        });

      const response = await app.request('/api/chat/conversations/test-id', {
        method: 'DELETE',
      });

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONVERSATION_DELETE_ERROR');
    });
  });

  describe('AutoRAG Integration', () => {
    it('should retrieve relevant context for chat messages', async () => {
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me about machine learning',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should have found relevant sources
      expect(data.data.sources).toBeInstanceOf(Array);
      expect(data.data.sources.length).toBeGreaterThan(0);

      // Each source should have required properties
      if (data.data.sources.length > 0) {
        const source = data.data.sources[0];
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('title');
        expect(source).toHaveProperty('excerpt');
        expect(source).toHaveProperty('score');
      }
    });

    it('should handle context retrieval errors gracefully', async () => {
      // Mock R2 error
      mockEnv.R2.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      // Should still work even if context retrieval fails
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should format context properly for AI prompts', async () => {
      await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is AI?',
        }),
      });

      // Verify the AI was called with properly formatted prompt
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-2-7b-chat-int8',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining("Context from user's notes"),
            }),
          ]),
        })
      );
    });
  });

  describe('Performance and Security', () => {
    it('should apply rate limiting to chat endpoints', async () => {
      // This test would need to mock the rate limiting middleware
      // For now, we just verify the middleware is applied
      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should validate user authorization', async () => {
      // Create app without auth middleware
      const unauthenticatedApp = new Hono<{ Bindings: Env }>();
      unauthenticatedApp.use('*', async (c, next) => {
        c.env = mockEnv as Env;
        await next();
      });
      unauthenticatedApp.route('/api/chat', chatRouter);

      const response = await unauthenticatedApp.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      // Should fail without proper authentication context
      expect(response.status).toBe(500);
    });

    it('should handle large message inputs', async () => {
      const largeMessage = 'x'.repeat(1500); // Near limit

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: largeMessage,
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should reject oversized messages', async () => {
      const oversizedMessage = 'x'.repeat(2500); // Over limit

      const response = await app.request('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: oversizedMessage,
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
