import { Hono } from 'hono';
import type { Context } from 'hono';
import { ErrorMessage } from './responseTypes';

/**
 * Creates user logout routes
 * @returns Hono app with logout routes
 */
export function createLogoutRoutes(): Hono {
  const app = new Hono();

  /**
   * POST /logout - User logout endpoint
   * Handles session invalidation (client-side token removal)
   * Since JWT tokens are stateless, logout is primarily client-side
   */
  app.post('/logout', async (c: Context) => {
    try {
      // Return success response
      // Client should remove the JWT token from storage
      return c.json({
        message: 'Logout successful'
      }, 200);

    } catch (error) {
      console.error('Logout error:', error);

      // Generic server error
      return c.json<ErrorMessage>({
        error: 'Internal server error',
        message: 'Failed to logout user'
      }, 500);
    }
  });

  return app;
}