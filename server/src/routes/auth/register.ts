import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Container } from '../../container/Container';
import type { IUserService } from '../../services';
import { registerSchema } from '../../validation/auth';
import { AuthenticationError, UserResponse } from '../../services';
import { ErrorMessage, ValidationErrorMessage } from '../responseTypes';

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
        return c.json<ValidationErrorMessage>({
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
      return c.json<UserResponse>(user, 201);

    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof AuthenticationError) {      
          return c.json<ErrorMessage>({
            error: 'Registration failed',
            message: error.message
          }, error.statusCode);
      }

      // Generic server error
      return c.json<ErrorMessage>({
        error: 'Internal server error',
        message: 'Failed to register user'
      }, 500);
    }
  });

  return app;
}