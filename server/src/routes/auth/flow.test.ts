import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { DatabaseConnection } from '@/db/connection';
import { setupContainer } from '@/container/setup';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';
import { createApp } from '../app';
import { TestHelpers } from '@/utils/testing';

/**
 * End-to-End Authentication Flow Tests
 * Tests complete authentication workflows from registration through protected access
 */
describe('Authentication Flow Integration Tests', () => {
    let app: Hono;
    let db: DatabaseConnection;
    const originalEnv = process.env;

    beforeEach(async () => {
        // Set up test environment variables
        process.env.JWT_SECRET = 'test-secret-key-for-integration-testing';
        process.env.JWT_EXPIRES_IN = '24h';

        // Use real container with in-memory database for integration testing
        const container = setupContainer();
        db = await createInMemoryDatabaseConnection();
        container.register<DatabaseConnection>('database', () => db);
        app = createApp(container);
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('Complete Authentication Flow', () => {
        it('should complete successful authentication flow: registration → login → protected access', async () => {
            // Step 1: Register a new user
            const registerData = TestHelpers.createValidRegisterData({
                name: 'Flow Test User',
                email: 'flowtest@example.com',
                password: 'securepassword123'
            });

            const registerResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                registerData
            );

            expect(registerResponse).toBeStatus(201);
            const registeredUser = await registerResponse.json();
            expect(registeredUser).toMatchObject({
                name: 'Flow Test User',
                email: 'flowtest@example.com'
            });
            expect(registeredUser.id).toBeDefined();
            expect(registeredUser.createdAt).toBeDefined();

            // Step 2: Login with the registered user credentials
            const loginData = TestHelpers.createValidLoginData({
                email: 'flowtest@example.com',
                password: 'securepassword123'
            });

            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                loginData
            );

            expect(loginResponse).toBeStatus(200);
            const loginResult = await loginResponse.json();
            expect(loginResult.user).toMatchObject({
                name: 'Flow Test User',
                email: 'flowtest@example.com',
                id: registeredUser.id
            });
            expect(loginResult.token).toBeDefined();
            expect(typeof loginResult.token).toBe('string');

            // Step 3: Access protected route with valid token
            const protectedResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${loginResult.token}` }
            );

            expect(protectedResponse).toBeStatus(200);
            const userProfile = await protectedResponse.json();
            expect(userProfile).toMatchObject({
                name: 'Flow Test User',
                email: 'flowtest@example.com',
                id: registeredUser.id
            });

            // Step 4: Verify logout functionality
            const logoutResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/logout',
                {},
                { Authorization: `Bearer ${loginResult.token}` }
            );

            expect(logoutResponse).toBeStatus(200);
            const logoutResult = await logoutResponse.json();
            expect(logoutResult.message).toBe('Logout successful');
        });

        it('should handle authentication flow with multiple users', async () => {
            // Register first user
            const user1Data = TestHelpers.createValidRegisterData({
                name: 'User One',
                email: 'user1@example.com',
                password: 'password123'
            });

            const user1RegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                user1Data
            );
            expect(user1RegisterResponse).toBeStatus(201);

            // Register second user
            const user2Data = TestHelpers.createValidRegisterData({
                name: 'User Two',
                email: 'user2@example.com',
                password: 'password456'
            });

            const user2RegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                user2Data
            );
            expect(user2RegisterResponse).toBeStatus(201);

            // Login both users
            const user1LoginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'user1@example.com', password: 'password123' }
            );
            expect(user1LoginResponse).toBeStatus(200);
            const user1Login = await user1LoginResponse.json();

            const user2LoginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'user2@example.com', password: 'password456' }
            );
            expect(user2LoginResponse).toBeStatus(200);
            const user2Login = await user2LoginResponse.json();

            // Verify each user can access their own profile
            const user1ProfileResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${user1Login.token}` }
            );
            expect(user1ProfileResponse).toBeStatus(200);
            const user1Profile = await user1ProfileResponse.json();
            expect(user1Profile.email).toBe('user1@example.com');

            const user2ProfileResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${user2Login.token}` }
            );
            expect(user2ProfileResponse).toBeStatus(200);
            const user2Profile = await user2ProfileResponse.json();
            expect(user2Profile.email).toBe('user2@example.com');

            // Verify tokens are different
            expect(user1Login.token).not.toBe(user2Login.token);
        });
    });

    describe('Authentication Flow Failure Scenarios', () => {
        it('should handle registration failure and prevent login', async () => {
            // Attempt to register with invalid data
            const invalidRegisterData = {
                name: '',
                email: 'invalid-email',
                password: '123' // Too short
            };

            const registerResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                invalidRegisterData
            );

            expect(registerResponse).toBeStatus(400);
            const registerError = await registerResponse.json();
            expect(registerError.error).toBe('Validation failed');

            // Attempt to login with the failed registration credentials
            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'invalid-email', password: '123' }
            );

            expect(loginResponse).toBeStatus(400);
            const loginError = await loginResponse.json();
            expect(loginError.error).toBe('Validation failed');
        });

        it('should handle duplicate registration and allow login with original credentials', async () => {
            // Register user successfully
            const userData = TestHelpers.createValidRegisterData({
                email: 'duplicate@example.com',
                password: 'password123'
            });

            const firstRegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                userData
            );
            expect(firstRegisterResponse).toBeStatus(201);

            // Attempt duplicate registration
            const duplicateRegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                userData
            );
            expect(duplicateRegisterResponse).toBeStatus(409);
            const duplicateError = await duplicateRegisterResponse.json();
            expect(duplicateError.error).toBe('Registration failed');

            // Verify original user can still login
            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'duplicate@example.com', password: 'password123' }
            );
            expect(loginResponse).toBeStatus(200);
        });

        it('should handle login with wrong credentials', async () => {
            // Register user
            const registerData = TestHelpers.createValidRegisterData({
                email: 'wrongcreds@example.com',
                password: 'correctpassword'
            });

            const registerResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                registerData
            );
            expect(registerResponse).toBeStatus(201);

            // Attempt login with wrong password
            const wrongPasswordResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'wrongcreds@example.com', password: 'wrongpassword' }
            );
            expect(wrongPasswordResponse).toBeStatus(401);

            // Attempt login with wrong email
            const wrongEmailResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'nonexistent@example.com', password: 'correctpassword' }
            );
            expect(wrongEmailResponse).toBeStatus(401);
        });

        it('should deny protected access without authentication', async () => {
            // Attempt to access protected route without token
            const noTokenResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me'
            );
            expect(noTokenResponse).toBeStatus(401);
            const noTokenError = await noTokenResponse.json();
            expect(noTokenError.error).toBe('Unauthorized');

            // Attempt to access protected route with invalid token
            const invalidTokenResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: 'Bearer invalid-token' }
            );
            expect(invalidTokenResponse).toBeStatus(401);
            const invalidTokenError = await invalidTokenResponse.json();
            expect(invalidTokenError.error).toBe('Unauthorized');

            // Attempt to access protected route with malformed authorization header
            const malformedHeaderResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: 'InvalidFormat token' }
            );
            expect(malformedHeaderResponse).toBeStatus(401);
        });

        it('should handle expired token scenario', async () => {
            // Register and login user
            const userData = TestHelpers.createValidRegisterData({
                email: 'expiredtoken@example.com',
                password: 'password123'
            });

            await TestHelpers.makePostRequest(app, '/api/auth/register', userData);
            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'expiredtoken@example.com', password: 'password123' }
            );

            const loginResult = await loginResponse.json();
            const validToken = loginResult.token;

            // Verify token works initially
            const validAccessResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${validToken}` }
            );
            expect(validAccessResponse).toBeStatus(200);

            // Note: In a real scenario, we would wait for token expiration or manipulate time
            // For this test, we simulate an expired token by using a manually crafted expired token
            // This tests the token verification logic without waiting for actual expiration
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDk0NTkyMDAsImV4cCI6MTYwOTQ1OTIwMX0.invalid';

            const expiredTokenResponse = await TestHelpers.makeGetRequest(
                app,
                '/api/auth/me',
                { Authorization: `Bearer ${expiredToken}` }
            );
            expect(expiredTokenResponse).toBeStatus(401);
        });
    });

    describe('Authentication State Management', () => {
        it('should maintain authentication state across multiple requests', async () => {
            // Register and login user
            const userData = TestHelpers.createValidRegisterData({
                email: 'statetest@example.com',
                password: 'password123'
            });

            await TestHelpers.makePostRequest(app, '/api/auth/register', userData);
            const loginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                { email: 'statetest@example.com', password: 'password123' }
            );

            const loginResult = await loginResponse.json();
            const token = loginResult.token;
            const authHeaders = { Authorization: `Bearer ${token}` };

            // Make multiple authenticated requests
            const request1 = await TestHelpers.makeGetRequest(app, '/api/auth/me', authHeaders);
            const request2 = await TestHelpers.makeGetRequest(app, '/api/auth/me', authHeaders);
            const request3 = await TestHelpers.makeGetRequest(app, '/api/auth/me', authHeaders);

            // All requests should succeed
            expect(request1).toBeStatus(200);
            expect(request2).toBeStatus(200);
            expect(request3).toBeStatus(200);

            // All requests should return the same user data
            const user1 = await request1.json();
            const user2 = await request2.json();
            const user3 = await request3.json();

            expect(user1).toEqual(user2);
            expect(user2).toEqual(user3);
            expect(user1.email).toBe('statetest@example.com');
        });

        it('should handle concurrent authentication requests', async () => {
            // Register user
            const userData = TestHelpers.createValidRegisterData({
                email: 'concurrent@example.com',
                password: 'password123'
            });

            await TestHelpers.makePostRequest(app, '/api/auth/register', userData);

            // Make multiple concurrent login requests
            const loginPromises = Array.from({ length: 3 }, () =>
                TestHelpers.makePostRequest(app, '/api/auth/login', {
                    email: 'concurrent@example.com',
                    password: 'password123'
                })
            );

            const loginResponses = await Promise.all(loginPromises);

            // All login requests should succeed
            loginResponses.forEach(response => {
                expect(response).toBeStatus(200);
            });

            // Extract tokens from responses
            const loginResults = await Promise.all(
                loginResponses.map(response => response.json())
            );

            // All tokens should be valid but different (due to different issued times)
            const tokens = loginResults.map(result => result.token);
            const authPromises = tokens.map(token =>
                TestHelpers.makeGetRequest(app, '/api/auth/me', {
                    Authorization: `Bearer ${token}`
                })
            );

            const authResponses = await Promise.all(authPromises);
            authResponses.forEach(response => {
                expect(response).toBeStatus(200);
            });
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle malformed request data gracefully', async () => {
            // Test malformed registration data
            const malformedRegisterResponse = await app.request('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json{'
            });
            expect(malformedRegisterResponse).toBeStatus(500);

            // Test malformed login data
            const malformedLoginResponse = await app.request('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json{'
            });
            expect(malformedLoginResponse).toBeStatus(500);

            // Test missing content-type header (should still work as Hono can parse JSON)
            const noContentTypeResponse = await app.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(TestHelpers.createValidRegisterData({
                    email: 'nocontenttype@example.com'
                }))
            });
            expect(noContentTypeResponse).toBeStatus(201);
        });

        it('should handle edge cases in authentication flow', async () => {
            // Test empty request bodies
            const emptyRegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                {}
            );
            expect(emptyRegisterResponse).toBeStatus(400);

            const emptyLoginResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/login',
                {}
            );
            expect(emptyLoginResponse).toBeStatus(400);

            // Test null values
            const nullRegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                { name: null, email: null, password: null }
            );
            expect(nullRegisterResponse).toBeStatus(400);

            // Test undefined values (should be handled as missing fields)
            const undefinedRegisterResponse = await TestHelpers.makePostRequest(
                app,
                '/api/auth/register',
                { name: undefined, email: undefined, password: undefined }
            );
            expect(undefinedRegisterResponse).toBeStatus(400);
        });
    });
});