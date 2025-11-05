import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { setupContainer } from '../container/setup';
import { DatabaseConnection } from '@/db/connection';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';
import { createApp } from './app';
import { TestHelpers } from '@/utils/testing';



describe('Protected Routes Integration Tests', () => {
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

    const protectedEndpoints = [
        ['/api/auth/me', 'GET'],
    ]

    it('should ensure expected routes are protected', async () => {
      // Hack: parameterized tests don't work in the VS test runner 
      // (althrough they do work in the command line)
      for(const [path, httpMethod] of protectedEndpoints) {
        // Act
        const response = await TestHelpers.makeRequest(app, path, httpMethod);

        // Assert        
        if (response.status !== 401) {
          // Fail - status is not 401 unauthorised
          const availableRoutes = app.routes.map(r => `Path: ${r.path}, Method ${r.method}`).join('\n');
          expect().fail(`${response.status} failed to mount route ${path} via method ${httpMethod} (${availableRoutes})`)
        }
      }
    });
  });
});