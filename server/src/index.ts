import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));

// Routes
app.get('/api/hello', (c) => {
  return c.json({ 
    message: 'Hello World from Yellow API!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'yellow-api' });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = process.env.PORT || 3000;

console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};