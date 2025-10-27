import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createLoginRoutes } from './login';
import { Container } from '../container/Container';
import type { IUserService, LoginUserData, UserResponse } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';

// Test Helper Functions for Login Route
const LoginTestHelpers = {
  // Data factories
  createValidUser: (overrides = {}): UserResponse => ({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
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

  // Setup helpers
  setupContainer: (userService: IUserService): Container => {
    const container = new Container();
    container.register<IUserService>('userService', () => userService);
    return container;
  },

  setupApp: (container: Container): Hono => {
    const app = new Hono();
    app.route('/auth', createLoginRoutes(container));
    return app;
  },

  // Request helpers
  makeRequest: async (app: Hono, path: string, method: string, body?: any): Promise<Response> => {
    const requestOptions: RequestInit = { method };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
      requestOptions.headers = { 'Content-Type': 'application/json' };
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

  normalizeUserDates: (user: UserResponse): any => ({
    ...user,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  })
};

describe('Login Route', () => {
  let mockUserService: IUserService;
  let app: Hono;

  beforeEach(() => {
    mockUserService = LoginTestHelpers.createMockUserService();
    const container = LoginTestHelpers.setupContainer(mockUserService);
    app = LoginTestHelpers.setupApp(container);
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const loginData = LoginTestHelpers.createValidLoginData();
      const expectedUser = LoginTestHelpers.createValidUser();
      const expectedResult = { user: expectedUser, token: 'jwt-token-123' };
      (mockUserService.login as any).mockResolvedValue(expectedResult);

      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      const data = await LoginTestHelpers.expectSuccessResponse(response, 200, 'Login successful');
      expect(data.user).toEqual(LoginTestHelpers.normalizeUserDates(expectedUser));
      expect(data.token).toBe('jwt-token-123');
      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should reject login with validation errors for empty fields', async () => {
      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', {
        email: '',
        password: ''
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveLength(2);
      expect(data.details).toContainEqual({
        field: 'email',
        message: 'Please enter a valid email address'
      });
      expect(data.details).toContainEqual({
        field: 'password',
        message: 'Password is required'
      });
    });

    it('should reject login with invalid email format', async () => {
      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', {
        email: 'invalid-email',
        password: 'password123'
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual({
        field: 'email',
        message: 'Please enter a valid email address'
      });
    });

    it('should reject login with empty password', async () => {
      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', {
        email: 'john@example.com',
        password: ''
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual({
        field: 'password',
        message: 'Password is required'
      });
    });

    it('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = LoginTestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(
        new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
      );

      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      await LoginTestHelpers.expectErrorResponse(response, 401, 'Authentication failed', 'Invalid email or password');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const loginData = LoginTestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      await LoginTestHelpers.expectErrorResponse(response, 500, 'Internal server error', 'Failed to authenticate user');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{'
      });

      // Assert
      expect([400, 500]).toContain(response.status);
    });

    it('should accept login with various password lengths', async () => {
      // Arrange
      const passwords = ['password123', 'verylongpasswordwithmanycharacters', 'pass1234'];
      const expectedUser = LoginTestHelpers.createValidUser();
      const expectedResult = { user: expectedUser, token: 'jwt-token-123' };
      (mockUserService.login as any).mockResolvedValue(expectedResult);

      for (const password of passwords) {
        // Act
        const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', {
          email: 'john@example.com',
          password
        });

        // Assert
        expect(response.status).toBe(200);
      }
    });

    it('should accept login with special characters in password', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'p@ssw0rd!#$'
      };
      const expectedUser = LoginTestHelpers.createValidUser();
      const expectedResult = { user: expectedUser, token: 'jwt-token-123' };
      (mockUserService.login as any).mockResolvedValue(expectedResult);

      // Act
      const response = await LoginTestHelpers.makeRequest(app, '/auth/login', 'POST', loginData);

      // Assert
      expect(response.status).toBe(200);
      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });
  });
});