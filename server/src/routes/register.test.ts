import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createRegisterRoutes } from './register';
import { Container } from '../container/Container';
import type { IUserService, RegisterUserData, UserResponse } from '../services/UserService';
import { AuthenticationError } from '../services/UserService';

// Test Helper Functions for Register Route
const RegisterTestHelpers = {
    // Data factories
    createValidUser: (overrides = {}): UserResponse => ({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        ...overrides
    }),

    createValidRegisterData: (overrides = {}): RegisterUserData => ({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        ...overrides
    }),

    // Mock factories
    createMockUserService: (): IUserService => ({
        register: mock(),
        login: mock(),
    }),

    // Setup helpers
    setupContainer: (userService: IUserService): Container => {
        const container = new Container();
        container.register<IUserService>('userService', () => userService);
        return container;
    },

    setupApp: (container: Container): Hono => {
        const app = new Hono();
        app.route('/auth', createRegisterRoutes(container));
        return app;
    },

    // Request helpers
    makeRequest: async (app: Hono, path: string, method: string, body?: any): Promise<Response> => {
        const requestOptions: RequestInit = { method };

        if (body) {
            requestOptions.body = JSON.stringify(body);
            requestOptions.headers = { 'Content-Type': 'application/json' };
        }

        return app.request(path, requestOptions);
    },

    // Assertion helpers
    expectSuccessResponse: async (response: Response, expectedStatus: number, expectedMessage: string) => {
        expect(response.status).toBe(expectedStatus);
        const data = await response.json();
        expect(data.message).toBe(expectedMessage);
        return data;
    },

    expectErrorResponse: async (response: Response, expectedStatus: number, expectedError: string, expectedMessage: string) => {
        expect(response.status).toBe(expectedStatus);
        const data = await response.json();
        expect(data.error).toBe(expectedError);
        expect(data.message).toBe(expectedMessage);
        return data;
    },

    normalizeUserDates: (user: UserResponse): any => ({
        ...user,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString()
    })
};

describe('Register Route', () => {
    let mockUserService: IUserService;
    let app: Hono;

    beforeEach(() => {
        mockUserService = RegisterTestHelpers.createMockUserService();
        const container = RegisterTestHelpers.setupContainer(mockUserService);
        app = RegisterTestHelpers.setupApp(container);
    });

    describe('POST /auth/register', () => {
        it('should register user successfully with valid data', async () => {
            // Arrange
            const userData = RegisterTestHelpers.createValidRegisterData();
            const expectedUser = RegisterTestHelpers.createValidUser();
            (mockUserService.register as any).mockResolvedValue(expectedUser);

            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

            // Assert
            const data = await RegisterTestHelpers.expectSuccessResponse(response, 201, 'User registered successfully');
            expect(data.user).toEqual(RegisterTestHelpers.normalizeUserDates(expectedUser));
            expect(mockUserService.register).toHaveBeenCalledWith(userData);
        });

        it('should reject registration with validation errors for empty fields', async () => {
            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', {
                name: '',
                email: '',
                password: ''
            });

            // Assert
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Validation failed');
            expect(data.details).toHaveLength(3);
            expect(data.details).toContainEqual({
                field: 'name',
                message: 'Name is required'
            });
        });

        it('should reject registration with invalid email format', async () => {
            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', {
                name: 'John Doe',
                email: 'invalid-email',
                password: 'password123'
            });

            // Assert
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Validation failed');
            expect(data.details).toContainEqual({
                field: 'email',
                message: 'Please enter a valid email address'
            });
        });

        it('should reject registration with short password', async () => {
            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', {
                name: 'John Doe',
                email: 'john@example.com',
                password: '123'
            });

            // Assert
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe('Validation failed');
            expect(data.details).toContainEqual({
                field: 'password',
                message: 'Password must be at least 8 characters long'
            });
        });

        it('should reject registration when email already exists', async () => {
            // Arrange
            const userData = RegisterTestHelpers.createValidRegisterData();
            (mockUserService.register as any).mockRejectedValue(AuthenticationError.emailAlreadyExists());

            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

            // Assert
            await RegisterTestHelpers.expectErrorResponse(response, 409, 'Registration failed', 'User with this email already exists');
        });

        it('should handle service errors gracefully', async () => {
            // Arrange
            const userData = RegisterTestHelpers.createValidRegisterData();
            (mockUserService.register as any).mockRejectedValue(new Error('Database error'));

            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

            // Assert
            await RegisterTestHelpers.expectErrorResponse(response, 500, 'Internal server error', 'Failed to register user');
        });

        it('should handle malformed JSON gracefully', async () => {
            // Act
            const response = await app.request('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json{'
            });

            // Assert
            expect([400, 500]).toContain(response.status);
        });

        it('should trim whitespace from name field', async () => {
            // Arrange
            const userData = {
                name: '  John Doe  ',
                email: 'john@example.com',
                password: 'password123'
            };
            const expectedUser = RegisterTestHelpers.createValidUser();
            (mockUserService.register as any).mockResolvedValue(expectedUser);

            // Act
            const response = await RegisterTestHelpers.makeRequest(app, '/auth/register', 'POST', userData);

            // Assert
            expect(response.status).toBe(201);
            expect(mockUserService.register).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            });
        });
    });
});