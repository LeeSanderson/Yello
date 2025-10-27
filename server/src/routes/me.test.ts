import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { createMeRoutes } from './me';
import { Container } from '../container/Container';
import type { UserResponse } from '../services/UserService';

// Test Helper Functions for Me Route
const MeTestHelpers = {
  // Data factories
  createValidUser: (overrides = {}): UserResponse => ({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  }),

  // Mock factories
  createMockAuthMiddleware: (shouldAuthenticate: boolean = true, user?: UserResponse): MiddlewareHandler => {
    if (shouldAuthenticate) {
      const mockUser = user || MeTestHelpers.createValidUser();
      return mock(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });
    } else {
      return mock(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }, 401);
      });
    }
  },

  createMockAuthMiddlewareWithError: (errorMessage: string): MiddlewareHandler => {
    return mock(async (c: Context, next: Next) => {
      return c.json({ 
        error: 'Unauthorized', 
        message: errorMessage 
      }, 401);
    });
  },

  // Setup helpers
  setupContainer: (authMiddleware: MiddlewareHandler): Container => {
    const container = new Container();
    container.register<MiddlewareHandler>('authMiddleware', () => authMiddleware);
    return container;
  },

  setupApp: (container: Container): Hono => {
    const app = new Hono();
    app.route('/auth', createMeRoutes(container));
    return app;
  },

  // Request helpers
  makeRequest: async (app: Hono, path: string, headers?: Record<string, string>): Promise<Response> => {
    return app.request(path, {
      method: 'GET',
      headers: headers || {}
    });
  },

  // Assertion helpers
  expectSuccessResponse: async (response: Response, expectedStatus: number) => {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data).toHaveProperty('user');
    return data;
  },

  expectErrorResponse: async (response: Response, expectedStatus: number, expectedError: string, expectedMessage: string) => {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.error).toBe(expectedError);
    expect(data.message).toBe(expectedMessage);
    return data;
  },

  normalizeUserDates: (user: UserResponse): any => ({
    ...user,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  })
};

describe('Me Route', () => {
  describe('GET /auth/me', () => {
    it('should return user profile when authenticated', async () => {
      // Arrange
      const mockUser = MeTestHelpers.createValidUser();
      const authMiddleware = MeTestHelpers.createMockAuthMiddleware(true, mockUser);
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer valid-token'
      });

      // Assert
      const data = await MeTestHelpers.expectSuccessResponse(response, 200);
      expect(data.user).toEqual(MeTestHelpers.normalizeUserDates(mockUser));
      expect(authMiddleware).toHaveBeenCalled();
    });

    it('should return different user profiles for different authenticated users', async () => {
      // Arrange
      const user1 = MeTestHelpers.createValidUser({ id: '1', name: 'User One', email: 'user1@example.com' });
      const user2 = MeTestHelpers.createValidUser({ id: '2', name: 'User Two', email: 'user2@example.com' });

      // Test user 1
      const authMiddleware1 = MeTestHelpers.createMockAuthMiddleware(true, user1);
      const container1 = MeTestHelpers.setupContainer(authMiddleware1);
      const app1 = MeTestHelpers.setupApp(container1);

      const response1 = await MeTestHelpers.makeRequest(app1, '/auth/me', {
        'Authorization': 'Bearer token1'
      });

      // Test user 2
      const authMiddleware2 = MeTestHelpers.createMockAuthMiddleware(true, user2);
      const container2 = MeTestHelpers.setupContainer(authMiddleware2);
      const app2 = MeTestHelpers.setupApp(container2);

      const response2 = await MeTestHelpers.makeRequest(app2, '/auth/me', {
        'Authorization': 'Bearer token2'
      });

      // Assert
      const data1 = await MeTestHelpers.expectSuccessResponse(response1, 200);
      const data2 = await MeTestHelpers.expectSuccessResponse(response2, 200);

      expect(data1.user.id).toBe('1');
      expect(data1.user.name).toBe('User One');
      expect(data2.user.id).toBe('2');
      expect(data2.user.name).toBe('User Two');
    });

    it('should reject unauthenticated requests', async () => {
      // Arrange
      const authMiddleware = MeTestHelpers.createMockAuthMiddleware(false);
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me');

      // Assert
      await MeTestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'No authentication token provided');
    });

    it('should reject requests with invalid tokens', async () => {
      // Arrange
      const authMiddleware = MeTestHelpers.createMockAuthMiddlewareWithError('Invalid token');
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer invalid-token'
      });

      // Assert
      await MeTestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'Invalid token');
    });

    it('should reject requests with expired tokens', async () => {
      // Arrange
      const authMiddleware = MeTestHelpers.createMockAuthMiddlewareWithError('Token has expired');
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer expired-token'
      });

      // Assert
      await MeTestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'Token has expired');
    });

    it('should reject requests when user is not found', async () => {
      // Arrange
      const authMiddleware = MeTestHelpers.createMockAuthMiddlewareWithError('User not found');
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer valid-token-but-user-deleted'
      });

      // Assert
      await MeTestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'User not found');
    });

    it('should handle middleware errors gracefully', async () => {
      // Arrange
      const authMiddleware = mock(async (c: Context, next: Next) => {
        throw new Error('Middleware error');
      });
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer some-token'
      });

      // Assert
      expect([401, 500]).toContain(response.status);
    });

    it('should preserve user context from middleware', async () => {
      // Arrange
      const mockUser = MeTestHelpers.createValidUser({
        id: 'context-test',
        name: 'Context User',
        email: 'context@example.com'
      });
      
      const authMiddleware = mock(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });
      
      const container = MeTestHelpers.setupContainer(authMiddleware);
      const app = MeTestHelpers.setupApp(container);

      // Act
      const response = await MeTestHelpers.makeRequest(app, '/auth/me', {
        'Authorization': 'Bearer test-token'
      });

      // Assert
      const data = await MeTestHelpers.expectSuccessResponse(response, 200);
      expect(data.user.id).toBe('context-test');
      expect(data.user.name).toBe('Context User');
      expect(data.user.email).toBe('context@example.com');
    });
  });
});