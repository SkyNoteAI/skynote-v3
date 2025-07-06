import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Env } from '../types/env';

export const authMiddleware = async (c: Context, next: Next) => {
  // Skip auth for health checks and public endpoints
  if (
    c.req.path === '/health' ||
    c.req.path === '/' ||
    c.req.path.startsWith('/api/auth/')
  ) {
    await next();
    return;
  }

  // Get token from Authorization header
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token
    const env = c.env as unknown as Env;
    const payload = await verify(token, env.JWT_SECRET || 'default-secret');

    if (!payload?.userId) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token missing user ID' },
        },
        401
      );
    }

    // Verify user exists in database (skip in dev mode if no DB)
    if (env.DB) {
      const user = await env.DB.prepare(
        'SELECT id, email, name FROM users WHERE id = ?'
      )
        .bind(payload.userId)
        .first();

      if (!user) {
        return c.json(
          {
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          },
          401
        );
      }

      // Add user context to request
      (c as any).set('userId', user.id);
      (c as any).set('user', user);
    } else {
      // Development mode - use payload data
      (c as any).set('userId', payload.userId);
      (c as any).set('user', {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
      });
    }

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      },
      401
    );
  }
};
