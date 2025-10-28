import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Container } from '../container/Container';
import type { IUserService, LoginResponse } from '../services/UserService';
import { loginSchema } from '../validation/auth';
import { AuthenticationError } from '../services/UserService';
import { ErrorMessage, ValidationErrorMessage } from './responseTypes';

/**
 * Creates user login routes
 * @param container - Dependency injection container
 * @returns Hono app with login routes
 */
export function createLoginRoutes(container: Container): Hono {
  const app = new Hono();
  const userService = container.get<IUserService>('userService');

  /**
   * POST /login - User login endpoint
   * Validates credentials and returns JWT token with user information
   */
  app.post('/login', async (c: Context) => {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const validationResult = loginSchema.safeParse(body);

      if (!validationResult.success) {
        return c.json<ValidationErrorMessage>({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }, 400);
      }

      const { email, password } = validationResult.data;

      // Authenticate user using UserService
      const loginResult = await userService.login({ email, password });

      // Return success response with user data and JWT token
      return c.json<LoginResponse>(loginResult, 200);

    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof AuthenticationError) {
        return c.json<ErrorMessage>({
          error: 'Authentication failed',
          message: 'Invalid email or password'
        }, error.statusCode);        
      }

      // Generic server error
      return c.json<ErrorMessage>({
        error: 'Internal server error',
        message: 'Failed to authenticate user'
      }, 500);
    }
  });

  return app;
}