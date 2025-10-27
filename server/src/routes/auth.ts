import { Hono } from 'hono';
import type { Container } from '../container/Container';
import { createRegisterRoutes } from './register';
import { createLoginRoutes } from './login';
import { createMeRoutes } from './me';
import { createLogoutRoutes } from './logout';

/**
 * Creates authentication routes with dependency injection
 * @param container - Dependency injection container
 * @returns Hono app with authentication routes
 */
export function createAuthRoutes(container: Container): Hono {
  const app = new Hono();

  // Mount individual route modules
  app.route('/', createRegisterRoutes(container));
  app.route('/', createLoginRoutes(container));
  app.route('/', createMeRoutes(container));
  app.route('/', createLogoutRoutes());

  return app;
}