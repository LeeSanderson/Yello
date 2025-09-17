import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { testConnection, db } from './db/connection';
import { users, workspaces, projects, tasks } from './db/schema';
import { eq } from 'drizzle-orm';

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

app.get('/api/health', async (c) => {
  const dbConnected = await testConnection();
  return c.json({ 
    status: dbConnected ? 'ok' : 'error', 
    service: 'yellow-api',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Database test routes
app.get('/api/users', async (c) => {
  try {
    const allUsers = await db.select().from(users);
    return c.json({ data: allUsers });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.get('/api/workspaces', async (c) => {
  try {
    const allWorkspaces = await db.select().from(workspaces);
    return c.json({ data: allWorkspaces });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

app.get('/api/projects', async (c) => {
  try {
    const allProjects = await db.select().from(projects);
    return c.json({ data: allProjects });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

app.get('/api/tasks', async (c) => {
  try {
    const allTasks = await db.select().from(tasks);
    return c.json({ data: allTasks });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = process.env.PORT || 3000;

// Initialize database connection on startup
testConnection().then((connected) => {
  if (connected) {
    console.log(`🚀 Server running on http://localhost:${port}`);
  } else {
    console.log(`⚠️  Server running on http://localhost:${port} (database disconnected)`);
  }
});

export default {
  port,
  fetch: app.fetch,
};