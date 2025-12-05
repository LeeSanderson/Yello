import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { DatabaseConnection } from '@/db/connection';
import { setupContainer } from '@/container/setup';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';
import { createApp } from '../app';
import { TestHelpers } from '@/utils/testing';

/**
 * End-to-End Authentication Flow Tests
 * 
 * Following the Testing Pyramid guidelines:
 * - Focus on critical user journeys (happy path + ONE major error scenario)
 * - Test complete workflows from registration through protected access
 * - Do NOT test individual validation rules (covered by unit tests)
 * - Do NOT test specific error messages (covered by unit tests)
 * - Do NOT test API response structure details (covered by integration tests)
 * 
 * These tests verify that the authentication system works as a whole from
 * the user's perspective.
 */
describe('Authentication Flow E2E Tests', () => {
    let app: Hono;
    let db: DatabaseConnection;
    const originalEnv = process.env;

    beforeEach(async () => {
        process.env.JWT_SECRET = 'test-secret-key-for-e2e-testing';
        process.env.JWT_EXPIRES_IN = '24h';

        const container = setupContainer();
        db = await createInMemoryDatabaseConnection();
        container.register<DatabaseConnection>('database', () => db);
        app = createApp(container);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    /**
     * Happy Path: Complete Authentication Journey
     * Tests the primary user workflow from registration to accessing protected resources
     */
    describe('User Registration and Login Flow', () => {
        it('should allow user to register, login, access protected resources, and logout', async () => {
            // User registers with valid credentials
            const registerData = TestHelpers.createValidRegisterData({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!'
            });

            const registerResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                registerData
            );

            expect(registerResponse.status).toBe(201);
            const registeredUser = await registerResponse.json();
            expect(registeredUser.email).toBe('john@example.com');
            expect(registeredUser.id).toBeDefined();

            // User logs in with registered credentials
            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'john@example.com', password: 'SecurePass123!' }
            );

            expect(loginResponse.status).toBe(200);
            const loginResult = await loginResponse.json();
            expect(loginResult.token).toBeDefined();
            expect(loginResult.user.email).toBe('john@example.com');

            // User accesses protected resource with token
            const protectedResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${loginResult.token}` }
            );

            expect(protectedResponse.status).toBe(200);
            const userProfile = await protectedResponse.json();
            expect(userProfile.email).toBe('john@example.com');

            // User logs out
            const logoutResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/logout',
                {},
                { Authorization: `Bearer ${loginResult.token}` }
            );

            expect(logoutResponse.status).toBe(200);
        });
    });
});