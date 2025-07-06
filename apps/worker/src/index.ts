import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logging';
import { rateLimit, rateLimitConfigs } from './middleware/rateLimit';
import { notesRouter } from './routes/notes';
import { authRouter } from './routes/auth';

const app = new Hono();

// Global middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      // In development, allow all origins. In production, check ALLOWED_ORIGINS
      if (!origin) return null;
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('*', requestLogger);

// Rate limiting
app.use('/api/*', rateLimit(rateLimitConfigs.moderate));

// Authentication middleware (applied to all /api/* routes except auth)
app.use('/api/*', authMiddleware);

// Error handling
app.onError(errorHandler);

// Routes
app.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      message: 'SkyNote AI Worker is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/health', (c) => {
  const env = c.env;
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env?.ENVIRONMENT || 'development',
    },
  });
});

// API routes
app.route('/api/auth', authRouter);
app.route('/api/notes', notesRouter);

export default app;
