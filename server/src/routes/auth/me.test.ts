import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { createMeRoutes } from './me';
import { ContainerBuilder, MiddlewareHandlerBuilder, TestHelpers } from '../../utils/testing';

describe('Me Route', () => {
  let app: Hono;
  let authMiddleware: MiddlewareHandlerBuilder;

  beforeEach(() => {
    const containerBuilder = new ContainerBuilder();    
    authMiddleware = containerBuilder.addAuthMiddleware();
    app = TestHelpers.setupApp(createMeRoutes, containerBuilder.toContainer());
  });

  afterEach(() => {
    mock.restore()
  });  

  describe('GET /me', () => {
    it('should return user profile when authenticated', async () => {
      // Arrange
      const user = TestHelpers.createValidUser();
      authMiddleware.setCurrentUser(user);

      // Act
      const response = await TestHelpers.makeGetRequest(app, '/me', {
        'Authorization': 'Bearer valid-token'
      });

      // Assert
      expect(response).toBeJson(200, TestHelpers.normalizeUserDates(user))
    });

    it('should reject unauthenticated requests', async () => {
      // Arrange
      authMiddleware.setUnauthorized();

      // Act
      const response = await TestHelpers.makeGetRequest(app, '/me');

      // Assert
      expect(response)
        .toBeJson(401, {error: 'Unauthorized', message: 'No authentication token provided'})
    });

    it('should handle middleware errors gracefully', async () => {
      // Arrange
      authMiddleware.setThrowError();

      // Act
      const response = await TestHelpers.makeGetRequest(app, '/me', {
        'Authorization': 'Bearer some-token'
      });

      // Assert
      expect(response).toBeStatus(500);
    });
  });
});