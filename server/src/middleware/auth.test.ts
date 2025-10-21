import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './auth';
import type { IAuthHelper } from './AuthHelper';
import type { UserResponse } from '../services';
import type { JWTPayload } from '../utils/jwt';
import { Hono, type Context } from 'hono';

describe('Authentication Middleware', () => {
    let mockAuthHelper: IAuthHelper;
    let app: Hono;
    let requestContext: Context;

    const mockUserResponse: UserResponse = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    const mockJWTPayload: JWTPayload = {
        userId: 'test-user-id',
        email: 'test@example.com'
    };

    beforeEach(() => {
        // Create mock auth helper
        mockAuthHelper = {
            getTokenFromContext: mock(() => 'valid-token'),
            verifyToken: mock(() => mockJWTPayload),
            findUserByToken: mock(() => Promise.resolve(mockUserResponse)),
        };

        app = new Hono();
        app.use("/auth/*", createAuthMiddleware(mockAuthHelper));
        app.get("/auth/*", c => { 
            requestContext = c;
            return c.text("OK")
        });

        app.use("/optionalAuth/*", createOptionalAuthMiddleware(mockAuthHelper));
        app.get("/optionalAuth/*", c => { 
            requestContext = c;
            return c.text("OK")
        });

    });

    describe('createAuthMiddleware', () => {
        it('should authenticate user with valid token', async () => {
            const req = new Request("http://localhost/auth/valid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(200)
            expect(requestContext.get('user')).toMatchObject(mockUserResponse);
        });

        it('should return 401 when no token is provided', async () => {
            (mockAuthHelper.getTokenFromContext as any).mockReturnValue(null);
            const req = new Request("http://localhost/auth/no-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(401);
            expect(await res.json()).toMatchObject(
                {error: 'Unauthorized', message: 'No authentication token provided'});            
        });

        it('should return 401 when token is invalid', async () => {
            (mockAuthHelper.getTokenFromContext as any).mockReturnValue('invalid-token');
            (mockAuthHelper.verifyToken as any).mockImplementation(() => {
                throw new Error('Invalid token');
            });
            const req = new Request("http://localhost/auth/invalid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(401);
            expect(await res.json()).toMatchObject(
                {error: 'Unauthorized', message: 'Invalid token'});            
        });

        it('should return 401 when user is not found', async () => {
            (mockAuthHelper.findUserByToken as any).mockResolvedValue(null);

            const req = new Request("http://localhost/auth/invalid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(401)
            expect(await res.json()).toMatchObject(
                {error: 'Unauthorized', message: 'User not found'});
        });

        it('should return 500 when database error occurs', async () => {
            (mockAuthHelper.findUserByToken as any).mockRejectedValue(
                new Error('Database connection failed'));
            const req = new Request("http://localhost/auth/invalid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(500);
        });
    });

    describe('createOptionalAuthMiddleware', () => {
        it('should authenticate user with valid token', async () => {
            const req = new Request("http://localhost/optionalAuth/valid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(200)
            expect(requestContext.get('user')).toMatchObject(mockUserResponse);
        });

        it('should continue without authentication when no token is provided', async () => {
            (mockAuthHelper.getTokenFromContext as any).mockReturnValue(null);

            const req = new Request("http://localhost/optionalAuth/no-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(200)
            expect(requestContext.get('user')).toBeUndefined();
        });

        it('should continue without authentication when token is invalid', async () => {
            (mockAuthHelper.verifyToken as any).mockImplementation(() => {
                throw new Error('Invalid token');
            });
            const req = new Request("http://localhost/optionalAuth/invalid-token");
            
            const res = await app.request(req);

            expect(res.status).toBe(200)
            expect(requestContext.get('user')).toBeUndefined();
        });

        it('should not continue without authentication when user is not found', async () => {
            (mockAuthHelper.findUserByToken as any).mockResolvedValue(null);
            const req = new Request("http://localhost/optionalAuth/no-user");
            
            const res = await app.request(req);

            expect(res.status).toBe(401)
            expect(await res.json()).toMatchObject(
                {error: 'Unauthorized', message: 'User not found'});
        });

        it('should not continue without authentication when database error occurs', async () => {
            (mockAuthHelper.findUserByToken as any).mockRejectedValue(
                new Error('Database connection failed'));
            const req = new Request("http://localhost/optionalAuth/db-error");

            const res = await app.request(req);

            expect(res.status).toBe(500)
        });
    });
});