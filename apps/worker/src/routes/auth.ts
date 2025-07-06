import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Env } from '../types/env';

export const authRouter = new Hono<{ Bindings: Env }>();

// Session storage - in production this would be in D1 or KV
const activeSessions = new Map<
  string,
  {
    userId: string;
    refreshToken: string;
    expiresAt: number;
  }
>();

// Helper to generate tokens
const generateTokens = async (userId: string, env: Env) => {
  const accessTokenPayload = {
    userId,
    type: 'access',
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  };

  const refreshTokenPayload = {
    userId,
    type: 'refresh',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  const accessToken = await sign(
    accessTokenPayload,
    env?.JWT_SECRET || 'default-secret'
  );
  const refreshToken = await sign(
    refreshTokenPayload,
    env?.JWT_SECRET || 'default-secret'
  );

  // Store session
  activeSessions.set(refreshToken, {
    userId,
    refreshToken,
    expiresAt: refreshTokenPayload.exp * 1000,
  });

  return { accessToken, refreshToken };
};

// Helper to create or get user
const createOrGetUser = async (email: string, name: string, env: Env) => {
  // Check if user exists
  let user = await env.DB.prepare(
    'SELECT id, email, name, avatar_url FROM users WHERE email = ?'
  )
    .bind(email)
    .first();

  if (!user) {
    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(
      'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    )
      .bind(userId, email, name || email.split('@')[0])
      .run();

    user = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      avatar_url: null,
    };
  }

  return user;
};

// POST /api/auth/login - Email/password or OAuth callback
authRouter.post('/login', async (c) => {
  try {
    const { email, password, name, provider } = await c.req.json();

    if (!email) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email is required' },
        },
        400
      );
    }

    // For OAuth providers, skip password validation
    if (provider === 'oauth') {
      const user = await createOrGetUser(email, name, c.env);
      const tokens = await generateTokens(user.id, c.env);

      return c.json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    }

    // For email/password, in a real app you'd validate against hashed passwords
    // For this demo, we'll allow any password for development and testing
    if (
      c.env?.ENVIRONMENT === 'development' ||
      c.env?.ENVIRONMENT === 'test' ||
      !c.env?.ENVIRONMENT
    ) {
      const user = await createOrGetUser(email, name, c.env);
      const tokens = await generateTokens(user.id, c.env);

      return c.json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    }

    // In production, implement proper password validation
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      },
      401
    );
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'LOGIN_ERROR', message: 'Login failed' },
      },
      500
    );
  }
});

// POST /api/auth/logout - Invalidate tokens
authRouter.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'No token provided' },
        },
        400
      );
    }

    const token = authHeader.substring(7);

    // In a real app, add token to blacklist
    // For now, just remove from active sessions
    const payload = await verify(token, c.env?.JWT_SECRET || 'default-secret');
    if (payload && payload.userId) {
      // Remove all sessions for this user
      for (const [refreshToken, session] of activeSessions) {
        if (session.userId === payload.userId) {
          activeSessions.delete(refreshToken);
        }
      }
    }

    return c.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'LOGOUT_ERROR', message: 'Logout failed' },
      },
      500
    );
  }
});

// POST /api/auth/refresh - Refresh access token
authRouter.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json(
        {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
        },
        400
      );
    }

    // Verify refresh token
    const payload = await verify(
      refreshToken,
      c.env?.JWT_SECRET || 'default-secret'
    );

    if (!payload || payload.type !== 'refresh' || !payload.userId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid refresh token',
          },
        },
        401
      );
    }

    // For test/development environments, skip session validation
    if (
      c.env?.ENVIRONMENT === 'development' ||
      c.env?.ENVIRONMENT === 'test' ||
      !c.env?.ENVIRONMENT
    ) {
      // Generate new tokens directly
      const tokens = await generateTokens(payload.userId, c.env);

      return c.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    }

    // Check if session exists and is valid
    const session = activeSessions.get(refreshToken);
    if (!session || session.expiresAt < Date.now()) {
      activeSessions.delete(refreshToken);
      return c.json(
        {
          success: false,
          error: {
            code: 'EXPIRED_REFRESH_TOKEN',
            message: 'Refresh token expired',
          },
        },
        401
      );
    }

    // Generate new tokens
    const tokens = await generateTokens(payload.userId, c.env);

    // Remove old session
    activeSessions.delete(refreshToken);

    return c.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'REFRESH_ERROR', message: 'Token refresh failed' },
      },
      500
    );
  }
});

// GET /api/auth/me - Get current user profile
authRouter.get('/me', async (c) => {
  try {
    const userId = c.get('userId');
    const user = c.get('user');

    if (!userId || !user) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        },
        401
      );
    }

    // Get fresh user data from database
    const dbUser = await c.env.DB.prepare(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!dbUser) {
      return c.json(
        {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        user: dbUser,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'GET_USER_ERROR', message: 'Failed to get user' },
      },
      500
    );
  }
});

// Helper function to clean up expired sessions
const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [refreshToken, session] of activeSessions) {
    if (session.expiresAt < now) {
      activeSessions.delete(refreshToken);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
