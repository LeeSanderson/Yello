import type { Context, Next } from 'hono';
import { JWTUtils } from '../utils/jwt';
import type { UserResponse } from '../services/UserService';
import type { IUserRepository } from '../repositories/UserRepository';

export interface AuthenticatedContext extends Context {
  get(key: 'user'): UserResponse;
  set(key: 'user', value: UserResponse): void;
}

export interface AuthMiddlewareOptions {
  userRepository: IUserRepository;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user context to authenticated requests
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const { userRepository } = options;

  return async (c: Context, next: Next) => {
    try {
      // Extract token from Authorization header
      const authorization = c.req.header('Authorization');
      const token = JWTUtils.extractTokenFromHeader(authorization);

      if (!token) {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }, 401);
      }

      // Verify and decode token
      let decoded;
      try {
        decoded = JWTUtils.verifyToken(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
        return c.json({ 
          error: 'Unauthorized', 
          message: errorMessage 
        }, 401);
      }

      // Get user from database to ensure user still exists and get current data
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'User not found' 
        }, 401);
      }

      // Attach user context to request
      const userResponse: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      c.set('user', userResponse);
      await next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Authentication failed' 
      }, 500);
    }
  };
}

/**
 * Optional Authentication Middleware
 * Allows both authenticated and unauthenticated access
 * Attaches user context when token is present and valid
 */
export function createOptionalAuthMiddleware(options: AuthMiddlewareOptions) {
  const { userRepository } = options;

  return async (c: Context, next: Next) => {
    try {
      // Extract token from Authorization header
      const authorization = c.req.header('Authorization');
      const token = JWTUtils.extractTokenFromHeader(authorization);

      // If no token, continue without authentication
      if (!token) {
        await next();
        return;
      }

      // Try to verify and decode token
      let decoded;
      try {
        decoded = JWTUtils.verifyToken(token);
      } catch (error) {
        // If token is invalid, continue without authentication
        await next();
        return;
      }

      // Get user from database
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        // If user not found, continue without authentication
        await next();
        return;
      }

      // Attach user context to request
      const userResponse: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      c.set('user', userResponse);
      await next();
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      // On error, continue without authentication
      await next();
    }
  };
}