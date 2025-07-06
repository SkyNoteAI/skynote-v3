import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Env } from '../types/env';

export const errorHandler = (error: Error, c: Context) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle HTTP exceptions
  if (error instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error.message,
          status: error.status,
        },
      },
      error.status
    );
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.message,
        },
      },
      400
    );
  }

  // Handle database errors
  if (error.message.includes('D1_ERROR')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
        },
      },
      500
    );
  }

  // Handle rate limit errors
  if (error.message.includes('RATE_LIMIT')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
        },
      },
      429
    );
  }

  // Default error response
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          (c.env as unknown as Env)?.ENVIRONMENT === 'production'
            ? 'Internal server error'
            : error.message,
      },
    },
    500
  );
};
