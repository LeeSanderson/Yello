import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createLogoutRoutes } from './logout';

// Test Helper Functions for Logout Route
const LogoutTestHelpers = {
  // Setup helpers
  setupApp: (): Hono => {
    const app = new Hono();
    app.route('/auth', createLogoutRoutes());
    return app;
  },

  // Request helpers
  makeRequest: async (app: Hono, path: string, headers?: Record<string, string>): Promise<Response> => {
    return app.request(path, {
      method: 'POST',
      headers: headers || {}
    });
  },

  // Assertion helpers
  expectSuccessResponse: async (response: Response, expectedStatus: number, expectedMessage: string) => {
    expect(response.status).toBe(expectedStatus);
    const data = await response.json();
    expect(data.message).toBe(expectedMessage);
    return data;
  }
};

describe('Logout Route', () => {
  let app: Hono;

  beforeEach(() => {
    app = LogoutTestHelpers.setupApp();
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully without authentication', async () => {
      // Act
      const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout');

      // Assert
      const data = await LogoutTestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
      expect(Object.keys(data)).toEqual(['message']);
    });

    it('should logout successfully with authorization header', async () => {
      // Act
      const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout', {
        'Authorization': 'Bearer some-token'
      });

      // Assert
      await LogoutTestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
    });

    it('should logout successfully with various authorization headers', async () => {
      // Arrange
      const authHeaders = [
        'Bearer valid-token',
        'Bearer expired-token',
        'Bearer invalid-token',
        'Bearer jwt-token-123'
      ];

      for (const authHeader of authHeaders) {
        // Act
        const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout', {
          'Authorization': authHeader
        });

        // Assert
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe('Logout successful');
      }
    });

    it('should logout successfully with custom headers', async () => {
      // Act
      const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout', {
        'Authorization': 'Bearer token',
        'User-Agent': 'Test Client',
        'X-Custom-Header': 'custom-value'
      });

      // Assert
      await LogoutTestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
    });

    it('should return consistent response format', async () => {
      // Act
      const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data).toBe('object');
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
      expect(data.message).toBe('Logout successful');
      
      // Should only have message property
      expect(Object.keys(data)).toHaveLength(1);
    });

    it('should handle concurrent logout requests', async () => {
      // Act - Make multiple concurrent logout requests
      const promises = Array.from({ length: 5 }, () => 
        LogoutTestHelpers.makeRequest(app, '/auth/logout', {
          'Authorization': 'Bearer concurrent-test-token'
        })
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify response data
      const dataPromises = responses.map(response => response.json());
      const dataResults = await Promise.all(dataPromises);
      
      dataResults.forEach(data => {
        expect(data.message).toBe('Logout successful');
      });
    });

    it('should handle empty request body', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ''
      });

      // Assert
      await LogoutTestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
    });

    it('should handle request with JSON body', async () => {
      // Act
      const response = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ someData: 'value' })
      });

      // Assert
      await LogoutTestHelpers.expectSuccessResponse(response, 200, 'Logout successful');
    });

    it('should be stateless and not require authentication', async () => {
      // This test verifies that logout works without any authentication
      // which is correct for JWT-based systems where logout is client-side
      
      // Act
      const response = await LogoutTestHelpers.makeRequest(app, '/auth/logout');

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Logout successful');
    });
  });
});