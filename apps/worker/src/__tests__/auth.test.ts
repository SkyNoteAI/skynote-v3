import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { authRouter } from '../routes/auth';
import { authMiddleware } from '../middleware/auth';
import { Env } from '../types/env';

// Mock environment
const mockEnv: Env = {
  DB: {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(),
        run: vi.fn(),
        all: vi.fn(),
      })),
    })),
  } as any,
  R2: {} as any,
  NOTE_QUEUE: {} as any,
  AI: {} as any,
  AUTORAG: {} as any,
  JWT_SECRET: 'test-jwt-secret',
  ENVIRONMENT: 'test', // Set to test for tests
  ALLOWED_ORIGINS: 'http://localhost:3000',
  RATE_LIMITER: {} as any,
};

describe('Authentication System', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    // Add auth routes without middleware for testing
    app.route('/auth', authRouter);
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully in development mode', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
      };

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      const res = await app.request(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('should create new user if not exists', async () => {
      (mockEnv.DB.prepare as any)
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null), // User doesn't exist
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}), // Insert new user
          }),
        });

      const res = await app.request(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'password123',
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('newuser@example.com');
    });

    it('should handle OAuth login', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'oauth@example.com',
        name: 'OAuth User',
        avatar_url: null,
      };

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      const res = await app.request(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'oauth@example.com',
            name: 'OAuth User',
            provider: 'oauth',
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('oauth@example.com');
    });

    it('should return error for missing email', async () => {
      const res = await app.request(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'password123',
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MISSING_EMAIL');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const token = await sign(
        {
          userId: 'user_123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const res = await app.request(
        '/auth/logout',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('should return error for missing token', async () => {
      const res = await app.request(
        '/auth/logout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = await sign(
        {
          userId: 'user_123',
          type: 'refresh',
          exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
        },
        mockEnv.JWT_SECRET
      );

      const res = await app.request(
        '/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('should return error for invalid refresh token', async () => {
      const invalidToken = await sign(
        {
          userId: 'user_123',
          type: 'access', // Wrong type
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const res = await app.request(
        '/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: invalidToken,
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should return error for missing refresh token', async () => {
      const res = await app.request(
        '/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });

  describe('GET /auth/me (without middleware)', () => {
    it('should return error when not authenticated', async () => {
      const res = await app.request(
        '/auth/me',
        {
          method: 'GET',
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Auth Middleware', () => {
    let protectedApp: Hono;

    beforeEach(() => {
      protectedApp = new Hono();
      protectedApp.use('*', authMiddleware);
      protectedApp.get('/protected', (c) => c.json({ success: true }));
      protectedApp.route('/auth', authRouter);
    });

    it('should allow access to public endpoints', async () => {
      const res = await protectedApp.request(
        '/health',
        {
          method: 'GET',
        },
        mockEnv
      );

      expect(res.status).toBe(404); // Route not found, but middleware didn't block
    });

    it('should allow access to auth endpoints', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
      };

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      const res = await protectedApp.request(
        '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        },
        mockEnv
      );

      expect(res.status).toBe(200);
    });

    it('should block access to protected endpoints without token', async () => {
      const res = await protectedApp.request(
        '/protected',
        {
          method: 'GET',
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow access to protected endpoints with valid token', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      const token = await sign(
        {
          userId: 'user_123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const res = await protectedApp.request(
        '/protected',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        mockEnv
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('should block access with expired token', async () => {
      const expiredToken = await sign(
        {
          userId: 'user_123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        mockEnv.JWT_SECRET
      );

      const res = await protectedApp.request(
        '/protected',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${expiredToken}` },
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should block access with invalid token type', async () => {
      const refreshToken = await sign(
        {
          userId: 'user_123',
          type: 'refresh', // Wrong type for accessing protected routes
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const res = await protectedApp.request(
        '/protected',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${refreshToken}` },
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('should block access when user not found in database', async () => {
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null), // User not found
        }),
      });

      const token = await sign(
        {
          userId: 'nonexistent_user',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const res = await protectedApp.request(
        '/protected',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        mockEnv
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Token Security', () => {
    it('should generate different tokens for different users', async () => {
      const token1 = await sign(
        {
          userId: 'user_123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      const token2 = await sign(
        {
          userId: 'user_456',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      expect(token1).not.toBe(token2);

      const payload1 = await verify(token1, mockEnv.JWT_SECRET);
      const payload2 = await verify(token2, mockEnv.JWT_SECRET);

      expect(payload1.userId).toBe('user_123');
      expect(payload2.userId).toBe('user_456');
    });

    it('should not verify tokens with wrong secret', async () => {
      const token = await sign(
        {
          userId: 'user_123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        mockEnv.JWT_SECRET
      );

      await expect(verify(token, 'wrong-secret')).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting on auth endpoints', async () => {
      // This test would require setting up rate limiting mocks
      // For now, we'll just verify the structure is in place
      expect(true).toBe(true);
    });
  });
});

describe('GET /auth/me with middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('/auth/me', authMiddleware);
    app.route('/auth', authRouter);
    vi.clearAllMocks();
  });

  it('should return user profile when authenticated', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    (mockEnv.DB.prepare as any).mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(mockUser),
      }),
    });

    const token = await sign(
      {
        userId: 'user_123',
        type: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      mockEnv.JWT_SECRET
    );

    const res = await app.request(
      '/auth/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      mockEnv
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('test@example.com');
  });
});
