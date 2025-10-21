import type { Context, Next } from 'hono';
import { JWTPayload } from '../utils/jwt';
import { IAuthHelper } from './AuthHelper';

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user context to authenticated requests
 */
export function createAuthMiddleware(helper: IAuthHelper) {
  return async (c: Context, next: Next) => {
    try {
      const token = helper.getTokenFromContext(c);

      if (!token) {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }, 401);
      }

      // Verify and decode token
      let decoded: JWTPayload;
      try {
        decoded = helper.verifyToken(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
        return c.json({ 
          error: 'Unauthorized', 
          message: errorMessage 
        }, 401);
      }

      // Get user from database to ensure user still exists and get current data
      const userResponse = await helper.findUserByToken(decoded);
      if (!userResponse) {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'User not found' 
        }, 401);
      }

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
export function createOptionalAuthMiddleware(helper: IAuthHelper) {
  return async (c: Context, next: Next) => {
    try {
      const token = helper.getTokenFromContext(c);

      // If no token, continue without authentication
      if (!token) {
        await next();
        return;
      }

      // Try to verify and decode token
      let decoded: JWTPayload;
      try {
        decoded = helper.verifyToken(token);
      } catch (error) {
        // If token is invalid, continue without authentication
        await next();
        return;
      }

      // Get user from database to ensure user still exists and get current data
      const userResponse = await helper.findUserByToken(decoded);
      if (!userResponse) {
        // If user not found, return error
        return c.json({ 
          error: 'Unauthorized', 
          message: 'User not found' 
        }, 401);
      }


      c.set('user', userResponse);
      await next();
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Authentication failed' 
      }, 500);
   }
  };
}