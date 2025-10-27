import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { createAuthRoutes } from './auth';
import { Container } from '../container/Container';
import type { IUserService, RegisterUserData, LoginUserData, UserResponse } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';

// Test Helper Functions
const TestHelpers = {
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
  },

  // Assertion helpers
  expectSuccessResponse: async (response: Response, expectedStatus: number, expectedMessage: string) => {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.message).toBe(expectedMessage);
    return data;
  },

  expectErrorResponse: async (response: Response, expectedStatus: number, expectedError: string, expectedMessage: string) => {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.error).toBe(expectedError);
    expect(data.message).toBe(expectedMessage);
    return data;
  },

  expectValidationError: async (response: Response, expectedField: string, expectedMessage: string) => {
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.details).toContainEqual({
      field: expectedField,
      message: expectedMessage
    });
    return data;
  },

  normalizeUserDates: (user: UserResponse): any => ({
    ...user,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  })
};

describe('Authentication Routes', () => {
  let mockUserService: IUserService;
  let mockAuthMiddleware: MiddlewareHandler;
  let app: Hono;

  beforeEach(() => {
    mockUserService = TestHelpers.createMockUserService();
    mockAuthMiddleware = TestHelpers.createMockAuthMiddleware();
    const container = TestHelpers.setupContainer(mockUserService, mockAuthMiddleware);
    app = TestHelpers.setupApp(container);
  });

  describe('POST /auth/register', () => {
    it('should register user successfully with valid data', async () => {
      // Arrange
      const userData = TestHelpers.createValidRegisterData();
      const expectedUser = TestHelpers.createValidUser();
      (mockUserService.register as any).mockResolvedValue(expectedUser);

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

      // Assert
      const data = await TestHelpers.expectSuccessResponse(response, 201, 'User registered successfully');
      expect(data.user).toEqual(TestHelpers.normalizeUserDates(expectedUser));
    });

    it('should reject registration with validation errors', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/register', 'POST', {
        name: '',
        email: 'invalid-email',
        password: '123'
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveLength(3);
    });

    it('should reject registration when email already exists', async () => {
      // Arrange
      const userData = TestHelpers.createValidRegisterData();
      (mockUserService.register as any).mockRejectedValue(AuthenticationError.emailAlreadyExists());

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

      // Assert
      await TestHelpers.expectErrorResponse(response, 409, 'Registration failed', 'User with this email already exists');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const userData = TestHelpers.createValidRegisterData();
      (mockUserService.register as any).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

      // Assert
      await TestHelpers.expectErrorResponse(response, 500, 'Internal server error', 'Failed to register user');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      const expectedUser = TestHelpers.createValidUser();
      const expectedResult = { user: expectedUser, token: 'jwt-token-123' };
      (mockUserService.login as any).mockResolvedValue(expectedResult);

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      const data = await TestHelpers.expectSuccessResponse(response, 200, 'Login successful');
      expect(data.user).toEqual(TestHelpers.normalizeUserDates(expectedUser));
      expect(data.token).toBe('jwt-token-123');
    });

    it('should reject login with validation errors', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/login', 'POST', {
        email: 'invalid-email',
        password: ''
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveLength(2);
    });

    it('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(
        new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
      );

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      await TestHelpers.expectErrorResponse(response, 401, 'Authentication failed', 'Invalid email or password');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      await TestHelpers.expectErrorResponse(response, 500, 'Internal server error', 'Failed to authenticate user');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile when authenticated', async () => {
      // Arrange
      const mockUser = TestHelpers.createValidUser();
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/me', 'GET', null, {
        'Authorization': 'Bearer valid-token'
      });

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toEqual(TestHelpers.normalizeUserDates(mockUser));
    });

    it('should reject unauthenticated requests', async () => {
      // Arrange
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ error: 'Unauthorized', message: 'No authentication token provided' }, 401);
      });

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/me', 'GET');

      // Assert
      await TestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'No authentication token provided');
    });

    it('should reject requests with invalid tokens', async () => {
      // Arrange
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
      });

      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/me', 'GET', null, {
        'Authorization': 'Bearer invalid-token'
      });

      // Assert
      await TestHelpers.expectErrorResponse(response, 401, 'Unauthorized', 'Invalid token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/logout', 'POST');

      // Assert
      const data = await TestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
      expect(Object.keys(data)).toEqual(['message']);
    });

    it('should logout successfully with authorization header', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/logout', 'POST', null, {
        'Authorization': 'Bearer some-token'
      });

      // Assert
      await TestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
    });
  });
});