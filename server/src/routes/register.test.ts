import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { createRegisterRoutes } from './register';
import type { IUserService } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';
import { ContainerBuilder, TestHelpers } from '../utils/testing';

describe('Register Route', () => {
    let mockUserService: IUserService;
    let app: Hono;

    beforeEach(() => {
        const containerBuilder = new ContainerBuilder();
        mockUserService = containerBuilder.addMockUserService()
        app = TestHelpers.setupApp(createRegisterRoutes, containerBuilder.toContainer());
    });

    afterEach(() => {
        mock.restore()
    });    

    describe('POST /auth/register', () => {
        it('should register user successfully with valid data', async () => {
            // Arrange
            const userData = TestHelpers.createValidRegisterData();
            const expectedUser = TestHelpers.createValidUser();
            (mockUserService.register as any).mockResolvedValue(expectedUser);

            // Act
            const response = await TestHelpers.makePostRequest(app, '/auth/register', userData);

            // Assert
            expect(response).toBeJson(201, TestHelpers.normalizeUserDates(expectedUser));
            expect(mockUserService.register).toHaveBeenCalledWith(userData);
        });

        it('should reject registration with validation errors for empty fields', async () => {
            // Act
            const response = await TestHelpers.makePostRequest(app, '/auth/register', {
                name: '',
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
                    { field: 'name', message: 'Name is required'},
                    { field: 'email', message: 'Please enter a valid email address'},
                    { field: 'password', message: 'Password must be at least 8 characters long'},
                    ]
                });
        });

        it('should reject registration when email already exists', async () => {
            // Arrange
            const userData = TestHelpers.createValidRegisterData();
            (mockUserService.register as any).mockRejectedValue(AuthenticationError.emailAlreadyExists());

            // Act
            const response = await TestHelpers.makePostRequest(app, '/auth/register', userData);

            // Assert
            expect(response)
                .toBeJson(409, { error: 'Registration failed', message: 'User with this email already exists' });
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            const userData = TestHelpers.createValidRegisterData();
            (mockUserService.register as any).mockRejectedValue(new Error('Database error'));

            // Act
            const response = await TestHelpers.makePostRequest(app, '/auth/register', userData);

            // Assert
            expect(response)
                .toBeJson(500, { error: 'Internal server error', message: 'Failed to register user' });
        });

        it('should handle malformed JSON gracefully', async () => {
            // Act
            const response = await app.request('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json{'
            });

            // Assert
            expect(response).toBeStatus(500);
        });
    });
});