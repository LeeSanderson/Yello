import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { createAuthRoutes } from './auth';
import { Container } from '../container/Container';
import type { IUserService, RegisterUserData, LoginUserData, UserResponse } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';

// Test Helper Functions for Auth Routes Integration
const AuthIntegrationTestHelpers = {
  // Data factories
  createValidUser: (overrides = {}): UserResponse => ({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  }),

  createValidRegisterData: (overrides = {}): RegisterUserData => ({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    ...overrides
  }),

  createValidLoginData: (overrides = {}): LoginUserData => ({
    email: 'john@example.com',
    password: 'password123',
    ...overrides
  }),

  // Mock factories
  createMockUserService: (): IUserService => ({
    register: mock(),
    login: mock(),
  }),

  createMockAuthMiddleware: (): MiddlewareHandler => 
    mock(async (c: Context, next: Next) => await next()),

  // Setup helpers
  setupContainer: (userService: IUserService, authMiddleware: MiddlewareHandler): Container => {
    const container = new Container();
    container.register<IUserService>('userService', () => userService);
    container.register<MiddlewareHandler>('authMiddleware', () => authMiddleware);
    return container;
  },

  setupApp: (container: Container): Hono => {
    const app = new Hono();
    app.route('/auth', createAuthRoutes(container));
    return app;
  },

  // Request helpers
  makeRequest: async (app: Hono, path: string, method: string, body?: any, headers?: Record<string, string>): Promise<Response> => {
    const requestOptions: RequestInit = { method };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
      requestOptions.headers = { 'Content-Type': 'application/json', ...headers };
    } else if (headers) {
      requestOptions.headers = headers;
    }

    return app.request(path, requestOptions);
  }
};

describe('Authentication Routes Integration', () => {
  let mockUserService: IUserService;
  let mockAuthMiddleware: MiddlewareHandler;
  let app: Hono;

  beforeEach(() => {
    mockUserService = AuthIntegrationTestHelpers.createMockUserService();
    mockAuthMiddleware = AuthIntegrationTestHelpers.createMockAuthMiddleware();
    const container = AuthIntegrationTestHelpers.setupContainer(mockUserService, mockAuthMiddleware);
    app = AuthIntegrationTestHelpers.setupApp(container);
  });

  describe('Route mounting integration', () => {
    it('should mount all authentication routes successfully', async () => {
      // Test that all routes are accessible (not 404)
      const routes = [
        { path: '/auth/register', method: 'POST' },
        { path: '/auth/login', method: 'POST' },
        { path: '/auth/me', method: 'GET' },
        { path: '/auth/logout', method: 'POST' }
      ];

      for (const route of routes) {
        const response = await AuthIntegrationTestHelpers.makeRequest(app, route.path, route.method, {});
        expect(response.status).not.toBe(404);
      }
    });

    it('should handle route composition correctly', async () => {
      // Test that routes don't interfere with each other
      const mockUser = AuthIntegrationTestHelpers.createValidUser();
      (mockUserService.register as any).mockResolvedValue(mockUser);
      (mockUserService.login as any).mockResolvedValue({ user: mockUser, token: 'test-token' });

      // Make requests to different routes
      const registerResponse = await AuthIntegrationTestHelpers.makeRequest(app, '/auth/register', 'POST', 
        AuthIntegrationTestHelpers.createValidRegisterData());
      const loginResponse = await AuthIntegrationTestHelpers.makeRequest(app, '/auth/login', 'POST', 
        AuthIntegrationTestHelpers.createValidLoginData());
      const logoutResponse = await AuthIntegrationTestHelpers.makeRequest(app, '/auth/logout', 'POST');

      expect(registerResponse.status).toBe(201);
      expect(loginResponse.status).toBe(200);
      expect(logoutResponse.status).toBe(200);
    });

    it('should maintain dependency injection across all routes', async () => {
      // Test that all routes have access to their required dependencies
      const mockUser = AuthIntegrationTestHelpers.createValidUser();
      (mockUserService.register as any).mockResolvedValue(mockUser);
      (mockUserService.login as any).mockResolvedValue({ user: mockUser, token: 'test-token' });

      // Test register route uses userService
      await AuthIntegrationTestHelpers.makeRequest(app, '/auth/register', 'POST', 
        AuthIntegrationTestHelpers.createValidRegisterData());
      expect(mockUserService.register).toHaveBeenCalled();

      // Test login route uses userService
      await AuthIntegrationTestHelpers.makeRequest(app, '/auth/login', 'POST', 
        AuthIntegrationTestHelpers.createValidLoginData());
      expect(mockUserService.login).toHaveBeenCalled();

      // Test me route uses authMiddleware
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });
      
      await AuthIntegrationTestHelpers.makeRequest(app, '/auth/me', 'GET', null, {
        'Authorization': 'Bearer test-token'
      });
      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should handle 404 for non-existent auth routes', async () => {
      const response = await AuthIntegrationTestHelpers.makeRequest(app, '/auth/nonexistent', 'GET');
      expect(response.status).toBe(404);
    });
  });
});