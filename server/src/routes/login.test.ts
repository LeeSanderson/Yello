import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { createLoginRoutes } from './login';
import type { IUserService } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';
import { ContainerBuilder, TestHelpers } from '../utils/testing';


describe('Login Route', () => {
  let mockUserService: IUserService;
  let app: Hono;

  beforeEach(() => {
    const containerBuilder = new ContainerBuilder();    
    mockUserService = containerBuilder.addMockUserService();
    app = TestHelpers.setupApp(createLoginRoutes, containerBuilder.toContainer());
  });

  afterEach(() => {
    mock.restore()
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      const expectedUser = TestHelpers.createValidUser();
      const expectedResult = { user: expectedUser, token: 'jwt-token-123' };
      (mockUserService.login as any).mockResolvedValue(expectedResult);

      // Act
      const response = await TestHelpers.makePostRequest(app, '/auth/login', loginData);
  
      // Assert
      expect(response)
        .toBeJson(
          200, 
          { 
            user: TestHelpers.normalizeUserDates(expectedUser), 
            token: 'jwt-token-123' 
          });
    });

    it('should reject login with validation errors for empty fields', async () => {
      // Act
      const response = await TestHelpers.makePostRequest(app, '/auth/login', {
        email: '',
        password: ''
      });

      // Assert
      expect(response)
        .toBeJson(
          400, 
          { 
            error: 'Validation failed',
            message: 'Invalid input data',
            details: [
              { field: 'email', message: 'Please enter a valid email address'},
              { field: 'password', message: 'Password is required'},
            ]
          });
    });


    it('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(
        AuthenticationError.invalidCredentials()
      );

      // Act
      const response = await TestHelpers.makePostRequest(app, '/auth/login', loginData);

      // Assert
      await expect(response)
        .toBeJson(401, {error: 'Authentication failed', message: 'Invalid email or password'})
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const loginData = TestHelpers.createValidLoginData();
      (mockUserService.login as any).mockRejectedValue(new Error('Database error'));

      // Act
      const response = await TestHelpers.makePostRequest(app, '/auth/login', loginData);

      // Assert
      expect(response)
        .toBeJson(500, {error: 'Internal server error', message: 'Failed to authenticate user'})
    });

    it('should handle malformed JSON gracefully', async () => {
      // Act
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{'
      });

      // Assert
      expect(response)
        .toBeJson(500, {error: 'Internal server error', message: 'Failed to authenticate user'})
    });
  });
});