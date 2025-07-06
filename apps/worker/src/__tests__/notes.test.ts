import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

describe('Notes CRUD API', () => {
  let mockEnv: any;

  beforeEach(() => {
    // Create a fresh mock environment for each test
    mockEnv = {
      JWT_SECRET: 'test-secret',
      ENVIRONMENT: 'test',
      DB: {
        prepare: vi.fn().mockImplementation((query: string) => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi
            .fn()
            .mockResolvedValue(
              query.includes('SELECT id, email, name FROM users')
                ? {
                    id: 'test-user-123',
                    email: 'test@example.com',
                    name: 'Test User',
                  }
                : null
            ),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      },
      R2: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('[]'),
        }),
      },
      NOTE_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
      RATE_LIMITER: {},
    };
  });

  // Helper to create authenticated request
  const createAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const token = await sign(
      { userId: 'test-user-123', email: 'test@example.com' },
      'test-secret'
    );

    return new Request(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  describe('Authentication', () => {
    it('should require authentication for all note endpoints', async () => {
      const endpoints = [
        { method: 'GET', url: 'http://localhost/api/notes' },
        { method: 'POST', url: 'http://localhost/api/notes' },
        { method: 'GET', url: 'http://localhost/api/notes/test-id' },
        { method: 'PUT', url: 'http://localhost/api/notes/test-id' },
        { method: 'DELETE', url: 'http://localhost/api/notes/test-id' },
        { method: 'POST', url: 'http://localhost/api/notes/test-id/restore' },
      ];

      for (const endpoint of endpoints) {
        const req = new Request(endpoint.url, { method: endpoint.method });
        const res = await app.fetch(req, mockEnv);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
          },
        });
      }
    });
  });

  describe('GET /api/notes', () => {
    it('should list notes successfully', async () => {
      // Mock successful response
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi
          .fn()
          .mockResolvedValue(
            query.includes('SELECT id, email, name FROM users')
              ? {
                  id: 'test-user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                }
              : null
          ),
        all: vi.fn().mockResolvedValue({
          results: query.includes('COUNT(*)')
            ? [{ count: 1 }]
            : [
                {
                  id: 'note-1',
                  title: 'Test Note',
                  slug: 'test-note',
                  folder_path: 'work',
                  tags: 'important,draft',
                  word_count: 100,
                  block_count: 5,
                  has_images: false,
                  markdown_generated_at: null,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                  deleted_at: null,
                },
              ],
        }),
      }));

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes'
      );
      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          notes: expect.arrayContaining([
            expect.objectContaining({
              id: 'note-1',
              title: 'Test Note',
              folder: 'work',
              tags: ['important', 'draft'],
              wordCount: 100,
              blockCount: 5,
            }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            totalCount: 1,
          }),
        },
      });
    });

    it('should handle pagination parameters', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes?page=2&limit=10'
      );
      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.pagination).toMatchObject({
        page: 2,
        limit: 10,
      });
    });
  });

  describe('POST /api/notes', () => {
    it('should create a new note successfully', async () => {
      // Mock tag creation
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi
          .fn()
          .mockResolvedValue(
            query.includes('SELECT id, email, name FROM users')
              ? {
                  id: 'test-user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                }
              : query.includes('SELECT id FROM tags')
                ? { id: 'tag-123' }
                : null
          ),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }));

      const noteData = {
        title: 'New Test Note',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
        tags: ['test', 'new'],
        folder: 'work',
      };

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes',
        {
          method: 'POST',
          body: JSON.stringify(noteData),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          title: 'New Test Note',
          folder: 'work',
          tags: ['test', 'new'],
          wordCount: 2, // "Hello world"
          blockCount: 1,
        },
      });

      // Verify R2 storage was called
      expect(mockEnv.R2.put).toHaveBeenCalled();
      // Verify queue was called
      expect(mockEnv.NOTE_QUEUE.send).toHaveBeenCalled();
    });

    it('should validate required title', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes',
        {
          method: 'POST',
          body: JSON.stringify({ content: [] }),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Title is required'),
        },
      });
    });

    it('should validate title length', async () => {
      const longTitle = 'a'.repeat(201);
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes',
        {
          method: 'POST',
          body: JSON.stringify({ title: longTitle }),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate tags format', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Note',
            tags: ['valid', 123, 'invalid'],
          }),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Tags must be an array of strings'),
        },
      });
    });
  });

  describe('GET /api/notes/:id', () => {
    it('should get a single note successfully', async () => {
      // Mock note exists in database
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(
          query.includes('SELECT id, email, name FROM users')
            ? {
                id: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
              }
            : query.includes('FROM notes')
              ? {
                  id: 'note-123',
                  title: 'Test Note',
                  slug: 'test-note',
                  folder_path: 'work',
                  r2_key_prefix: 'users/test-user-123/notes/note-123',
                  tags: 'important,draft',
                  word_count: 50,
                  block_count: 3,
                  has_images: false,
                  markdown_generated_at: null,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                  deleted_at: null,
                }
              : null
        ),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }));

      // Mock R2 content
      mockEnv.R2.get.mockResolvedValue({
        text: vi.fn().mockResolvedValue(
          JSON.stringify([
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Note content' }],
            },
          ])
        ),
      });

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/note-123'
      );
      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          id: 'note-123',
          title: 'Test Note',
          folder: 'work',
          tags: ['important', 'draft'],
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Note content' }],
            },
          ],
          wordCount: 50,
          blockCount: 3,
        },
      });

      // Verify R2 was called with correct key
      expect(mockEnv.R2.get).toHaveBeenCalledWith(
        'users/test-user-123/notes/note-123/content.json'
      );
    });

    it('should return 404 for non-existent note', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/non-existent'
      );
      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    });
  });

  describe('PUT /api/notes/:id', () => {
    it('should update a note successfully', async () => {
      // Mock note exists
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(
          query.includes('SELECT id, email, name FROM users')
            ? {
                id: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
              }
            : query.includes('SELECT id, r2_key_prefix FROM notes')
              ? {
                  id: 'note-123',
                  r2_key_prefix: 'users/test-user-123/notes/note-123',
                }
              : query.includes('SELECT id FROM tags')
                ? { id: 'tag-123' }
                : null
        ),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }));

      const updateData = {
        title: 'Updated Note',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Updated content' }],
          },
        ],
        tags: ['updated'],
      };

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/note-123',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          noteId: 'note-123',
          title: 'Updated Note',
          tags: ['updated'],
          wordCount: 2,
          blockCount: 1,
        },
      });

      // Verify R2 and queue operations
      expect(mockEnv.R2.put).toHaveBeenCalled();
      expect(mockEnv.NOTE_QUEUE.send).toHaveBeenCalled();
    });

    it('should return 404 for non-existent note', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/non-existent',
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Test' }),
        }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error.code).toBe('NOTE_NOT_FOUND');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('should soft delete a note successfully', async () => {
      // Mock note exists
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi
          .fn()
          .mockResolvedValue(
            query.includes('SELECT id, email, name FROM users')
              ? {
                  id: 'test-user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                }
              : query.includes('FROM notes') &&
                  query.includes('deleted_at IS NULL')
                ? { id: 'note-123' }
                : null
          ),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }));

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/note-123',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          noteId: 'note-123',
          message: 'Note deleted successfully',
        },
      });
    });

    it('should return 404 for non-existent note', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/non-existent',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error.code).toBe('NOTE_NOT_FOUND');
    });
  });

  describe('POST /api/notes/:id/restore', () => {
    it('should restore a deleted note successfully', async () => {
      // Mock deleted note exists
      mockEnv.DB.prepare.mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi
          .fn()
          .mockResolvedValue(
            query.includes('SELECT id, email, name FROM users')
              ? {
                  id: 'test-user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                }
              : query.includes('deleted_at IS NOT NULL')
                ? { id: 'note-123' }
                : null
          ),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }));

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/note-123/restore',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        data: {
          noteId: 'note-123',
          message: 'Note restored successfully',
        },
      });
    });

    it('should return 404 for non-deleted note', async () => {
      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes/note-123/restore',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Deleted note not found',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error after auth
      let callCount = 0;
      mockEnv.DB.prepare.mockImplementation((query: string) => {
        callCount++;
        // Let auth pass, then throw error for notes query
        if (
          callCount === 1 &&
          query.includes('SELECT id, email, name FROM users')
        ) {
          return {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue({
              id: 'test-user-123',
              email: 'test@example.com',
              name: 'Test User',
            }),
          };
        }
        throw new Error('Database connection failed');
      });

      const req = await createAuthenticatedRequest(
        'http://localhost/api/notes'
      );
      const res = await app.fetch(req, mockEnv);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'FETCH_NOTES_ERROR',
          message: 'Failed to fetch notes',
        },
      });
    });
  });
});
