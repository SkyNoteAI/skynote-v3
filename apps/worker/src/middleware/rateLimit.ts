import { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (_c: Context) => string;
}

export const rateLimit = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    // const _key = config.keyGenerator ? config.keyGenerator(c) : getDefaultKey(c);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use KV storage for rate limiting (simple implementation)
      // In production, you'd use Durable Objects for more sophisticated rate limiting

      // Get current count from KV (simulated with a simple counter)
      // This is a simplified implementation - in production use Durable Objects
      const userId = (c as any).get('userId') || 'anonymous';
      const requests = await countRequests(userId, windowStart, now);

      if (requests >= config.maxRequests) {
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs}ms`,
            },
          },
          429
        );
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString());
      c.header(
        'X-RateLimit-Remaining',
        (config.maxRequests - requests - 1).toString()
      );
      c.header('X-RateLimit-Reset', (now + config.windowMs).toString());

      await next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // Continue on error to avoid blocking requests
      await next();
    }
  };
};

// const getDefaultKey = (c: Context): string => {
//   const userId = (c as any).get('userId');
//   if (userId) {
//     return `user:${userId}`;
//   }
//
//   // Fallback to IP address
//   const forwarded = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
//   return `ip:${forwarded || 'unknown'}`;
// };

// Simple request counting (in production, use Durable Objects)
const countRequests = async (
  _userId: string,
  _windowStart: number,
  _now: number
): Promise<number> => {
  // This is a placeholder - implement with Durable Objects for production
  // For now, return a low count to allow development
  return 0;
};

// Common rate limit configurations
export const rateLimitConfigs = {
  strict: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
  moderate: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
  lenient: { windowMs: 60000, maxRequests: 1000 }, // 1000 requests per minute
  // Burst protection for high-frequency operations
  burstProtection: { windowMs: 1000, maxRequests: 10 }, // 10 requests per second
  // AI-specific rate limiting
  aiChat: { windowMs: 60000, maxRequests: 20 }, // 20 AI chat requests per minute
  aiGeneration: { windowMs: 300000, maxRequests: 50 }, // 50 AI requests per 5 minutes
};
