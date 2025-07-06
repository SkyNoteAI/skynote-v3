import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { errorHandler } from '../middleware/error';
import { requestLogger } from '../middleware/logging';

describe('Middleware', () => {
  describe('Auth Middleware', () => {
    it('should skip auth for public endpoints', async () => {
      const app = new Hono();
      app.use('*', authMiddleware);
      app.get('/health', (c) => c.json({ status: 'ok' }));

      const req = new Request('http://localhost/health');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);
    });

    it('should require auth header for protected routes', async () => {
      const app = new Hono();
      app.use('*', authMiddleware);
      app.get('/api/test', (c) => c.json({ message: 'protected' }));

      const req = new Request('http://localhost/api/test');
      const res = await app.fetch(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
    });

    it('should reject invalid tokens', async () => {
      const app = new Hono();
      app.use('*', authMiddleware);
      app.get('/api/test', (c) => c.json({ message: 'protected' }));

      const req = new Request('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });
      const res = await app.fetch(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    });
  });

  describe('Error Handler', () => {
    it('should handle HTTP errors properly', async () => {
      const app = new Hono();
      app.onError(errorHandler);
      app.get('/error', () => {
        throw new Error('Test error');
      });

      const req = new Request('http://localhost/error');
      const res = await app.fetch(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toMatchObject({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      });
    });
  });

  describe('Request Logger', () => {
    it('should add request ID to context', async () => {
      const app = new Hono();
      app.use('*', requestLogger);
      app.get('/test', (c) => {
        const requestId = (c as any).get('requestId');
        return c.json({ requestId });
      });

      const req = new Request('http://localhost/test');
      const res = await app.fetch(req);
      const json = await res.json();

      expect(json.requestId).toBeDefined();
      expect(typeof json.requestId).toBe('string');
    });
  });
});
