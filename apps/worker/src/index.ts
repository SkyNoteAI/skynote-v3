import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  // Add your Cloudflare bindings here
  // DB: D1Database;
  // R2: R2Bucket;
  // NOTE_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => {
  return c.json({ message: 'SkyNote AI Worker is running!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;