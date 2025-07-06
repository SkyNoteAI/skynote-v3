import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Performance Tests', () => {
  it('should handle requests quickly', async () => {
    const start = performance.now();

    // Make 50 requests to test performance
    const promises = Array.from({ length: 50 }, () => {
      const req = new Request('http://localhost/health');
      return app.fetch(req);
    });

    const responses = await Promise.all(promises);
    const duration = performance.now() - start;

    // All requests should succeed
    expect(responses.every((res) => res.status === 200)).toBe(true);

    // Should handle 50 requests in under 1 second
    expect(duration).toBeLessThan(1000);

    // Average response time should be under 20ms
    const avgResponseTime = duration / 50;
    expect(avgResponseTime).toBeLessThan(20);

    console.log(`📊 Performance Results:
    - Total time: ${duration.toFixed(2)}ms
    - Average time per request: ${avgResponseTime.toFixed(2)}ms
    - Requests per second: ${(50 / (duration / 1000)).toFixed(0)}`);
  });

  it('should handle concurrent auth requests', async () => {
    const start = performance.now();

    // Test concurrent auth requests
    const promises = Array.from({ length: 20 }, () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      });
      return app.fetch(req);
    });

    const responses = await Promise.all(promises);
    const duration = performance.now() - start;

    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(duration).toBeLessThan(500);

    console.log(
      `🔐 Auth Performance: ${duration.toFixed(2)}ms for 20 concurrent requests`
    );
  });
});
