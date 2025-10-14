import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;

export function createDatabaseConnection(config?: DatabaseConfig) {
  const connectionString = config?.connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://yellow_user:yellow_password@localhost:5432/yellow_dev';

  const pool = new Pool({
    connectionString,
    max: config?.maxConnections || 20,
    idleTimeoutMillis: config?.idleTimeoutMs || 30000,
    connectionTimeoutMillis: config?.connectionTimeoutMs || 2000,
  });

  return drizzle(pool);
}

export async function testConnection(db: DatabaseConnection) {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Create default database connection for application startup
export function createDefaultDatabaseConnection() {
  return createDatabaseConnection();
}