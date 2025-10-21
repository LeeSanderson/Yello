import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import type { Container } from '../container/Container';
import type { UserService } from '../services/UserService';
import { registerSchema, loginSchema } from '../validation/auth';
import { AuthenticationError, ValidationError } from '../services/UserService';
import type { UserResponse } from '../services/UserService';

/**
 * Creates authentication routes with dependency injection
 * @param container - Dependency injection container
 * @returns Hono app with authentication routes
 */
export function createAuthRoutes(container: Container): Hono {
  const app = new Hono();
  const userService = container.get<UserService>('userService');
  const authMiddleware = container.get<MiddlewareHandler>('authMiddleware');

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
        return c.json({
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
      return c.json({
        message: 'Login successful',
        user: loginResult.user,
        token: loginResult.token
      }, 200);

    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof AuthenticationError) {
        if (error.code === 'INVALID_CREDENTIALS') {
          return c.json({
            error: 'Authentication failed',
            message: 'Invalid email or password'
          }, 401);
        }
      }

      // Generic server error
      return c.json({
        error: 'Internal server error',
        message: 'Failed to authenticate user'
      }, 500);
    }
  });

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
      return c.json({
        user
      }, 200);

    } catch (error) {
      console.error('Profile error:', error);

      // Generic server error
      return c.json({
        error: 'Internal server error',
        message: 'Failed to retrieve user profile'
      }, 500);
    }
  });

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
      return c.json({
        error: 'Internal server error',
        message: 'Failed to logout user'
      }, 500);
    }
  });

  return app;
}