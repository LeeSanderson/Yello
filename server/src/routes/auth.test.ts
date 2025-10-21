import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { createAuthRoutes } from './auth';
import { Container } from '../container/Container';
import type { IUserService } from '../services/UserService';
import { AuthenticationError, ValidationError } from '../services/UserService';

describe('Authentication Routes', () => {
  let container: Container;
  let mockUserService: IUserService;
  let mockAuthMiddleware: MiddlewareHandler;
  let app: Hono;

  beforeEach(() => {
    // Create mock UserService
    mockUserService = {
      register: mock(),
      login: mock(),
    } as IUserService;

    // Create mock authentication middleware
    mockAuthMiddleware = mock(async (c: Context, next: Next) => {
      // Default behavior: no user set (unauthenticated)
      await next();
    });

    // Setup container with mock services
    container = new Container();
    container.register<IUserService>('userService', () => mockUserService);
    container.register<MiddlewareHandler>('authMiddleware', () => mockAuthMiddleware);

    // Create app with auth routes
    app = new Hono();
    app.route('/auth', createAuthRoutes(container));
  });

  describe('POST /auth/register', () => {
    it('should register user with valid data', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const expectedUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockUserService.register as any).mockResolvedValue(expectedUser);

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.message).toBe('User registered successfully');
      expect(responseData.user.id).toBe(expectedUser.id);
      expect(responseData.user.name).toBe(expectedUser.name);
      expect(responseData.user.email).toBe(expectedUser.email);
      expect(responseData.user.createdAt).toBeDefined();
      expect(responseData.user.updatedAt).toBeDefined();

      expect(mockUserService.register).toHaveBeenCalledWith(userData);
    });

    it('should return validation error for invalid email format', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      };

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'email',
          message: 'Please enter a valid email address'
        }
      ]);

      expect(mockUserService.register).not.toHaveBeenCalled();
    });

    it('should return validation error for weak password', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123' // Too short
      };

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'password',
          message: 'Password must be at least 8 characters long'
        }
      ]);

      expect(mockUserService.register).not.toHaveBeenCalled();
    });

    it('should return validation error for missing name', async () => {
      // Arrange
      const userData = {
        email: 'john@example.com',
        password: 'password123'
        // name is missing
      };

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'name',
          message: 'Invalid input: expected string, received undefined'
        }
      ]);

      expect(mockUserService.register).not.toHaveBeenCalled();
    });

    it('should return conflict error for duplicate email', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      (mockUserService.register as any).mockRejectedValue(
        new AuthenticationError('User with this email already exists', 'EMAIL_ALREADY_EXISTS')
      );

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(409);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Registration failed',
        message: 'User with this email already exists'
      });

      expect(mockUserService.register).toHaveBeenCalledWith(userData);
    });

    it('should return validation error for password strength issues', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      (mockUserService.register as any).mockRejectedValue(
        new ValidationError('Password must contain at least one uppercase letter', 'INVALID_PASSWORD')
      );

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Validation failed',
        message: 'Password must contain at least one uppercase letter'
      });

      expect(mockUserService.register).toHaveBeenCalledWith(userData);
    });

    it('should return server error for unexpected errors', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      (mockUserService.register as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Internal server error',
        message: 'Failed to register user'
      });

      expect(mockUserService.register).toHaveBeenCalledWith(userData);
    });

    it('should return validation error for multiple invalid fields', async () => {
      // Arrange
      const userData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        password: '123' // Too short password
      };

      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toHaveLength(3);
      
      // Check that all validation errors are present
      const fieldErrors = responseData.details.map((detail: any) => detail.field);
      expect(fieldErrors).toContain('name');
      expect(fieldErrors).toContain('email');
      expect(fieldErrors).toContain('password');

      expect(mockUserService.register).not.toHaveBeenCalled();
    });

    it('should return error for invalid JSON', async () => {
      // Act
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      // Assert
      expect(response.status).toBe(500);
      expect(mockUserService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };

      const expectedLoginResult = {
        user: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'jwt-token-123'
      };

      (mockUserService.login as any).mockResolvedValue(expectedLoginResult);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.message).toBe('Login successful');
      expect(responseData.user.id).toBe(expectedLoginResult.user.id);
      expect(responseData.user.name).toBe(expectedLoginResult.user.name);
      expect(responseData.user.email).toBe(expectedLoginResult.user.email);
      expect(responseData.token).toBe(expectedLoginResult.token);

      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return validation error for invalid email format', async () => {
      // Arrange
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'email',
          message: 'Please enter a valid email address'
        }
      ]);

      expect(mockUserService.login).not.toHaveBeenCalled();
    });

    it('should return validation error for missing password', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com'
        // password is missing
      };

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'password',
          message: 'Invalid input: expected string, received undefined'
        }
      ]);

      expect(mockUserService.login).not.toHaveBeenCalled();
    });

    it('should return validation error for empty password', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: ''
      };

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toEqual([
        {
          field: 'password',
          message: 'Password is required'
        }
      ]);

      expect(mockUserService.login).not.toHaveBeenCalled();
    });

    it('should return authentication error for invalid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword'
      };

      (mockUserService.login as any).mockRejectedValue(
        new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
      );

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });

      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return authentication error for non-existent user', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      (mockUserService.login as any).mockRejectedValue(
        new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
      );

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });

      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return JWT token in response on successful login', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };

      const expectedLoginResult = {
        user: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDY1NDI5MH0.abc123'
      };

      (mockUserService.login as any).mockResolvedValue(expectedLoginResult);

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.token).toBeDefined();
      expect(responseData.token).toBe(expectedLoginResult.token);
      expect(typeof responseData.token).toBe('string');
      expect(responseData.token.length).toBeGreaterThan(0);

      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return server error for unexpected errors', async () => {
      // Arrange
      const loginData = {
        email: 'john@example.com',
        password: 'password123'
      };

      (mockUserService.login as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Internal server error',
        message: 'Failed to authenticate user'
      });

      expect(mockUserService.login).toHaveBeenCalledWith(loginData);
    });

    it('should return validation error for multiple invalid fields', async () => {
      // Arrange
      const loginData = {
        email: 'invalid-email', // Invalid email
        password: '' // Empty password
      };

      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      // Assert
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.message).toBe('Invalid input data');
      expect(responseData.details).toHaveLength(2);
      
      // Check that all validation errors are present
      const fieldErrors = responseData.details.map((detail: any) => detail.field);
      expect(fieldErrors).toContain('email');
      expect(fieldErrors).toContain('password');

      expect(mockUserService.login).not.toHaveBeenCalled();
    });

    it('should return error for invalid JSON', async () => {
      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      // Assert
      expect(response.status).toBe(500);
      expect(mockUserService.login).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid authentication', async () => {
      // Arrange
      const mockUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock middleware to set authenticated user
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.user.id).toBe(mockUser.id);
      expect(responseData.user.name).toBe(mockUser.name);
      expect(responseData.user.email).toBe(mockUser.email);
      expect(responseData.user.createdAt).toBeDefined();
      expect(responseData.user.updatedAt).toBeDefined();

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should return 401 when no authentication token is provided', async () => {
      // Arrange
      // Mock middleware to return 401 for missing token
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }, 401);
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET'
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should return 401 when authentication token is invalid', async () => {
      // Arrange
      // Mock middleware to return 401 for invalid token
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'Invalid token' 
        }, 401);
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Unauthorized',
        message: 'Invalid token'
      });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should return 401 when authentication token is expired', async () => {
      // Arrange
      // Mock middleware to return 401 for expired token
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'Token expired' 
        }, 401);
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer expired-token' }
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Unauthorized',
        message: 'Token expired'
      });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      // Arrange
      // Mock middleware to return 401 for user not found
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'User not found' 
        }, 401);
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token-but-user-deleted' }
      });

      // Assert
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Unauthorized',
        message: 'User not found'
      });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('should return complete user profile information', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-06-20T14:45:00Z')
      };

      // Mock middleware to set authenticated user
      (mockAuthMiddleware as any).mockImplementation(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });

      // Act
      const response = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST'
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Logout successful'
      });
    });

    it('should logout successfully with authorization header', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer some-token' }
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Logout successful'
      });
    });

    it('should logout successfully without authorization header', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST'
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        message: 'Logout successful'
      });
    });

    it('should return proper response format', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Assert
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty('message');
      expect(responseData.message).toBe('Logout successful');
      expect(Object.keys(responseData)).toEqual(['message']);
    });

    it('should handle POST method only', async () => {
      // Test that GET method is not supported for logout
      const response = await app.request('/auth/logout', {
        method: 'GET'
      });

      // Should return 404 since GET /auth/logout is not defined
      expect(response.status).toBe(404);
    });
  });
});