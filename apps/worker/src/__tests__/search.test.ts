import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { searchRouter } from '../routes/search';
import { authMiddleware } from '../middleware/auth';
import { Env } from '../types/env';

// Mock environment
const mockEnv: Env = {
  DB: {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        all: vi.fn(() => Promise.resolve({ results: [] })),
        first: vi.fn(() => Promise.resolve(null)),
        run: vi.fn(() => Promise.resolve({ success: true })),
      })),
    })),
  } as any,
  R2: {
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
  } as any,
  NOTE_QUEUE: {
    send: vi.fn(() => Promise.resolve()),
  } as any,
  AI: {} as any,
  AUTORAG: {
    search: vi.fn(() => Promise.resolve({ documents: [] })),
    getContext: vi.fn(() => Promise.resolve({ sources: [] })),
  },
  JWT_SECRET: 'test-jwt-secret',
  ENVIRONMENT: 'test',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  RATE_LIMITER: {} as any,
};

const mockUserId = 'test-user-123';

describe('Search API', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', authMiddleware);
    app.route('/', searchRouter);
    vi.clearAllMocks();
  });

  const createAuthenticatedRequest = async (
    method: string,
    path: string,
    body?: any
  ) => {
    const payload = {
      userId: mockUserId,
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = await sign(payload, mockEnv.JWT_SECRET);

    return new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  describe('Keyword Search', () => {
    it('should validate query parameters', async () => {
      const req = await createAuthenticatedRequest('GET', '/?q=');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should perform basic keyword search', async () => {
      // Mock DB response with search results
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Test Note',
          slug: 'test-note',
          folder_path: null,
          word_count: 100,
          block_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          r2_key_prefix: 'users/test-user/notes/note-1',
          tags: 'tag1,tag2',
          relevance_score: 10,
        },
      ];

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockNotes }),
        }),
      });

      // Mock R2 content
      (mockEnv.R2.get as any).mockResolvedValue({
        text: () =>
          Promise.resolve(
            JSON.stringify([
              {
                type: 'paragraph',
                content: [{ text: 'This is test content' }],
              },
            ])
          ),
      });

      const req = await createAuthenticatedRequest('GET', '/?q=test');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.searchType).toBe('keyword');
      expect(data.data.query).toBe('test');
    });

    it('should handle database errors', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const req = await createAuthenticatedRequest('GET', '/?q=test');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SEARCH_ERROR');
    });
  });

  describe('Semantic Search', () => {
    it('should validate query parameters', async () => {
      const req = await createAuthenticatedRequest('GET', '/semantic?q=');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should perform semantic search via AutoRAG', async () => {
      const mockAutoragResponse = {
        documents: [
          {
            id: 'users/test-user/notes/note-1/content.md',
            content: 'Semantic search result content',
            score: 0.95,
          },
        ],
      };

      (mockEnv.AUTORAG.search as any).mockResolvedValue(mockAutoragResponse);

      const mockNotes = [
        {
          id: 'note-1',
          title: 'AI Note',
          slug: 'ai-note',
          folder_path: null,
          word_count: 150,
          block_count: 8,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          tags: null,
        },
      ];

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockNotes }),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/semantic?q=machine%20learning'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.searchType).toBe('semantic');
      expect(data.data.query).toBe('machine learning');
    });

    it('should handle AutoRAG errors', async () => {
      (mockEnv.AUTORAG.search as any).mockRejectedValue(
        new Error('AutoRAG error')
      );

      const req = await createAuthenticatedRequest('GET', '/semantic?q=test');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SEMANTIC_SEARCH_ERROR');
    });
  });

  describe('Similar Notes', () => {
    it('should return 404 for non-existent note', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/similar/non-existent'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOTE_NOT_FOUND');
    });

    it('should find similar notes', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Source Note',
        r2_key_prefix: 'users/test-user/notes/note-1',
      };

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockNote),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      (mockEnv.R2.get as any).mockResolvedValue({
        text: () =>
          Promise.resolve(
            JSON.stringify([
              {
                type: 'paragraph',
                content: [{ text: 'Note content for similarity' }],
              },
            ])
          ),
      });

      (mockEnv.AUTORAG.search as any).mockResolvedValue({ documents: [] });

      const req = await createAuthenticatedRequest('GET', '/similar/note-1');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.originalNote.id).toBe('note-1');
    });
  });

  describe('Search History', () => {
    it('should return search history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          query: 'test search',
          search_type: 'keyword',
          results_count: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: mockHistory,
          }),
        }),
      });

      const req = await createAuthenticatedRequest('GET', '/history');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.history).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/history?page=2&limit=10'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(10);
    });
  });

  describe('Input Validation', () => {
    it('should reject queries that are too short', async () => {
      const req = await createAuthenticatedRequest('GET', '/?q=a');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject queries that are too long', async () => {
      const longQuery = 'a'.repeat(201);
      const req = await createAuthenticatedRequest('GET', `/?q=${longQuery}`);
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce limit constraints', async () => {
      const req = await createAuthenticatedRequest('GET', '/?q=test&limit=100');
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Filters and Pagination', () => {
    it('should apply folder filter', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/?q=test&folder=work'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it('should apply tag filter', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/?q=test&tag=important'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const req = await createAuthenticatedRequest(
        'GET',
        '/?q=test&page=2&limit=5'
      );
      const res = await app.request(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
    });
  });
});
