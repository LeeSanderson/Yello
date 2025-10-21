import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { testConnection, type DatabaseConnection } from './db/connection';
import { setupContainer } from './container/setup';
import { createAuthRoutes } from './routes/auth';
import type { UserRepository } from './repositories/UserRepository';
import type { WorkspaceRepository } from './repositories/WorkspaceRepository';
import type { ProjectRepository } from './repositories/ProjectRepository';
import type { TaskRepository } from './repositories/TaskRepository';

// Setup dependency injection container
const container = setupContainer();
const app = new Hono();

// Middleware
app.use('*', cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));

// Routes
app.get('/api/health', async (c) => {
  const db = container.get<DatabaseConnection>('database');
  const dbConnected = await testConnection(db);
  return c.json({ 
    status: dbConnected ? 'ok' : 'error', 
    service: 'yellow-api',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.route('/api/auth', createAuthRoutes(container));

// Database test routes
app.get('/api/users', async (c) => {
  try {
    const userRepository = container.get<UserRepository>('userRepository');
    const allUsers = await userRepository.findAll();
    return c.json({ data: allUsers });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.get('/api/workspaces', async (c) => {
  try {
    const workspaceRepository = container.get<WorkspaceRepository>('workspaceRepository');
    const allWorkspaces = await workspaceRepository.findAll();
    return c.json({ data: allWorkspaces });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

app.get('/api/projects', async (c) => {
  try {
    const projectRepository = container.get<ProjectRepository>('projectRepository');
    const allProjects = await projectRepository.findAll();
    return c.json({ data: allProjects });
  } catch (error) {
    console.error('Database error:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

app.get('/api/tasks', async (c) => {
  try {
    const taskRepository = container.get<TaskRepository>('taskRepository');
    const allTasks = await taskRepository.findAll();
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
const db = container.get<DatabaseConnection>('database');
testConnection(db).then((connected) => {
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