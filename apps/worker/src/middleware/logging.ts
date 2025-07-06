import { Context, Next } from 'hono';

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to context
  (c as any).set('requestId', requestId);

  // Log request start
  console.log(
    JSON.stringify({
      type: 'request_start',
      requestId,
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      timestamp: new Date().toISOString(),
    })
  );

  await next();

  // Log request completion
  const duration = Date.now() - start;
  console.log(
    JSON.stringify({
      type: 'request_complete',
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      userId: (c as any).get('userId'),
      timestamp: new Date().toISOString(),
    })
  );
};

export const errorLogger = (error: Error, c: Context) => {
  console.error(
    JSON.stringify({
      type: 'error',
      requestId: (c as any).get('requestId'),
      message: error.message,
      stack: error.stack,
      path: c.req.path,
      method: c.req.method,
      userId: (c as any).get('userId'),
      timestamp: new Date().toISOString(),
    })
  );
};
