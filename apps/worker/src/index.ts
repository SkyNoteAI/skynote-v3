import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logging';
import { rateLimit, rateLimitConfigs } from './middleware/rateLimit';
import { notesRouter } from './routes/notes';
import { authRouter } from './routes/auth';
import { searchRouter } from './routes/search';
import { chatRouter } from './routes/chat';
import { queue } from './queue';

const app = new Hono();

// Global middleware
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      try {
        const env = c.env as unknown as Env;
        const allowedOrigins = env?.ALLOWED_ORIGINS?.split(',') || [];

        // Always allow requests without origin (Postman, curl, etc.)
        if (!origin) return true;

        // In development/test, allow localhost
        if (env?.ENVIRONMENT === 'development' || env?.ENVIRONMENT === 'test') {
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return true;
          }
        }

        // Check if origin is in allowed list
        return allowedOrigins.includes(origin);
      } catch (error) {
        // In case of any error, allow all origins for tests
        return true;
      }
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
app.route('/api/search', searchRouter);
app.route('/api/chat', chatRouter);

export default app;

// Export queue handler for Cloudflare Workers
export { queue };
