import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Worker API', () => {
  it('should return health status', async () => {
    const req = new Request('http://localhost/health');
    const res = await app.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        status: 'healthy',
        environment: 'development',
      },
    });
  });

  it('should return root message', async () => {
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        message: 'SkyNote AI Worker is running!',
        version: '1.0.0',
      },
    });
  });

  it('should handle CORS preflight', async () => {
    const req = new Request('http://localhost/api/notes', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const res = await app.fetch(req);

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173'
    );
  });

  it('should require auth for protected routes', async () => {
    const req = new Request('http://localhost/api/notes');
    const res = await app.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  });

  it('should allow access to auth routes', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    const res = await app.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        message: 'Auth API endpoint - POST /api/auth/login',
      },
    });
  });
});
