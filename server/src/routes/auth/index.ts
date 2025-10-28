import { Container } from '@/container/Container';
import { Hono } from 'hono';
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
  app.route('/auth', createRegisterRoutes(container));
  app.route('/auth', createLoginRoutes(container));
  app.route('/auth', createMeRoutes(container));
  app.route('/auth', createLogoutRoutes());

  return app;
}