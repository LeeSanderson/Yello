import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { DatabaseConnection } from '@/db/connection';
import { setupContainer } from '@/container/setup';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';
import { createApp } from './app';
import { TestHelpers } from '@/utils/testing';

describe('Integration Tests', () => {
  let app: Hono;
  let db: DatabaseConnection;

  beforeEach(async () => {
    // Use real container for all services, but swap out external dependencies 
    // (e.g database for in-memory db)
    const container = setupContainer();
    db = await createInMemoryDatabaseConnection();
    container.register<DatabaseConnection>('database', () => db);
    app = createApp(container);
  })

  describe('Successful route mounting and accessibility', () => {

    const endpoints = [
        ['/api/health', 'GET'],
        ['/api/auth/register', 'POST'],
        ['/api/auth/login', 'POST'],
        ['/api/auth/me', 'GET'],
        ['/api/auth/logout', 'POST']
    ]

    it('should mount expected routes', async () => {
      // Hack: parameterized tests don't work in the VS test runner 
      // (althrough they do work in the command line)
      for(const [path, httpMethod] of endpoints) {
        // Act
        const response = await TestHelpers.makeRequest(app, path, httpMethod);

        // Assert        
        if (response.status === 404) {
          // Fail - status is 404 not found
          const availableRoutes = app.routes.map(r => `Path: ${r.path}, Method ${r.method}`).join('\n');
          expect().fail(`failed to mount route ${path} via method ${httpMethod} (${availableRoutes})`)
        }
      }
    });

    it('should return not found for unregistered routes', async () => {
        const response = await TestHelpers.makeGetRequest(app, '/api/unexpected');
        expect(response).toBeStatus(404);
    })
  });
});