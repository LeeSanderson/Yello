import { ContainerBuilder, TestHelpers } from '@/utils/testing';
import { describe, it, expect } from 'bun:test';
import { createAuthRoutes } from '.';

describe('Route mounting integration', () => {
    it('should mount all authentication routes successfully', async () => {
      // Test that all routes are accessible (not 404)
      const containerBuilder = new ContainerBuilder();
      containerBuilder.addMockUserService();
      containerBuilder.addAuthMiddleware().setCurrentUser();
      const app = createAuthRoutes(containerBuilder.toContainer())
      const routes = [
        { path: '/auth/register', method: 'POST' },
        { path: '/auth/login', method: 'POST' },
        { path: '/auth/me', method: 'GET' },
        { path: '/auth/logout', method: 'POST' }
      ];

      for (const route of routes) {
        const response = await TestHelpers.makeRequest(app, route.path, route.method, {});
        expect(response.status).not.toBe(404);
      }
    });
});