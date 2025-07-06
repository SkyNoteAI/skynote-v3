import { Hono } from 'hono';

export const authRouter = new Hono();

// Placeholder auth routes
authRouter.post('/login', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Auth API endpoint - POST /api/auth/login',
      token: 'placeholder-jwt-token',
    },
  });
});

authRouter.post('/logout', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Auth API endpoint - POST /api/auth/logout',
    },
  });
});

authRouter.post('/refresh', async (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Auth API endpoint - POST /api/auth/refresh',
      token: 'new-placeholder-jwt-token',
    },
  });
});

authRouter.get('/me', async (c) => {
  const userId = (c as any).get('userId');
  return c.json({
    success: true,
    data: {
      message: 'Auth API endpoint - GET /api/auth/me',
      userId: userId || 'anonymous',
    },
  });
});
