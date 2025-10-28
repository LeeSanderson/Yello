import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { createLogoutRoutes } from './logout';
import { ContainerBuilder, TestHelpers } from '../utils/testing';

describe('Logout Route', () => {
  let app: Hono;

  beforeEach(() => {
    app = TestHelpers.setupApp(createLogoutRoutes, new ContainerBuilder().toContainer());
  });

  afterEach(() => {
    mock.restore()
  });


  describe('POST /auth/logout', () => {
    it('should logout successfully without authentication', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/logout', 'POST');

      // Assert
      expect(response).toBeJson(200, {message: 'Logout successful'});
    });

    it('should logout successfully with authorization header', async () => {
      // Act
      const response = await TestHelpers.makeRequest(app, '/auth/logout', 'POST', null, {
        'Authorization': 'Bearer some-token'
      });

      // Assert
      expect(response).toBeJson(200, {message: 'Logout successful'});
    });
  });
});