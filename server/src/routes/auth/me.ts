import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import type { Container } from '../../container/Container';
import type { UserResponse } from '../../services/UserService';
import { ErrorMessage } from '../responseTypes';

/**
 * Creates user profile routes
 * @param container - Dependency injection container
 * @returns Hono app with profile routes
 */
export function createMeRoutes(container: Container): Hono {
  const app = new Hono();
  const authMiddleware = container.get<MiddlewareHandler>('authMiddleware');

  /**
   * GET /me - User profile endpoint
   * Returns current user information for authenticated requests
   * Requires authentication middleware
   */
  app.get('/me', authMiddleware, async (c: Context) => {
    try {
      // Get user from context (set by authentication middleware)
      const user = c.get('user') as UserResponse;

      // Return user profile information
      return c.json<UserResponse>(user, 200);

    } catch (error) {
      console.error('Profile error:', error);

      // Generic server error
      return c.json<ErrorMessage>({
        error: 'Internal server error',
        message: 'Failed to retrieve user profile'
      }, 500);
    }
  });

  return app;
}