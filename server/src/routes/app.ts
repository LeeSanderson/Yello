import { Container } from "@/container/Container";
import { Hono } from "hono";
import { createHealthRoutes } from "./health";
import { createAuthRoutes } from "./auth";
import { cors } from "hono/cors";

export function createApp(container: Container): Hono {
  const app = new Hono();

  // Middleware
  app.use('*', cors({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true,
  }));
  
  // Healthcheck routes
  app.route('/api', createHealthRoutes(container));
  
  // Authentication routes
  app.route('/api/', createAuthRoutes(container));
  
  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });
  
  return app;
}