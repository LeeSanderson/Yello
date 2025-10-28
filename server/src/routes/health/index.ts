import { Container } from "@/container/Container";
import { DatabaseConnection, testConnection } from "@/db/connection";
import { IDateService } from "@/services";
import { Hono } from "hono";

export type HealthCheckResult = {
    status: 'ok' | 'error',
    service: 'yellow-api',
    database: 'connected' | 'disconnected',
    timestamp: Date
}

export function createHealthRoutes(container: Container): Hono {
  const app = new Hono();
  const db = container.get<DatabaseConnection>('database');
  const dateService = container.get<IDateService>('dateService');

  app.get('/health', async (c) => {
    const dbConnected = await testConnection(db);
    return c.json<HealthCheckResult>({ 
      status: dbConnected ? 'ok' : 'error', 
      service: 'yellow-api',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: dateService.now()
    });
  });
  
  return app;
}