import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Container } from '../container/Container';
import type { IUserService } from '../services/UserService';
import { registerSchema } from '../validation/auth';
import { AuthenticationError, ValidationError } from '../services/UserService';

/**
 * Creates user registration routes
 * @param container - Dependency injection container
 * @returns Hono app with registration routes
 */
export function createRegisterRoutes(container: Container): Hono {
  const app = new Hono();
  const userService = container.get<IUserService>('userService');

  /**
   * POST /register - User registration endpoint
   * Validates input data and creates new user account
   */
  app.post('/register', async (c: Context) => {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const validationResult = registerSchema.safeParse(body);

      if (!validationResult.success) {
        return c.json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }, 400);
      }

      const { name, email, password } = validationResult.data;

      // Register user using UserService
      const user = await userService.register({ name, email, password });

      // Return success response with user data (excluding password)
      return c.json({
        message: 'User registered successfully',
        user
      }, 201);

    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof AuthenticationError) {
        if (error.code === 'EMAIL_ALREADY_EXISTS') {
          return c.json({
            error: 'Registration failed',
            message: 'User with this email already exists'
          }, 409);
        }
      }

      if (error instanceof ValidationError) {
        return c.json({
          error: 'Validation failed',
          message: error.message
        }, 400);
      }

      // Generic server error
      return c.json({
        error: 'Internal server error',
        message: 'Failed to register user'
      }, 500);
    }
  });

  return app;
}