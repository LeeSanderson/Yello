import { testConnection, type DatabaseConnection } from './db/connection';
import { setupContainer } from './container/setup';
import { createApp } from './routes/app';

// Setup dependency injection container
const container = setupContainer();
const app = createApp(container);

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