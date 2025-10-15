import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './auth';
import { JWTUtils } from '../utils/jwt';
import type { IUserRepository, User } from '../repositories/UserRepository';
import type { Context, Next } from 'hono';

describe('Authentication Middleware', () => {
    let mockUserRepository: IUserRepository;
    let mockContext: Context;
    let mockNext: Next;

    const mockUser: User = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    beforeEach(() => {
        // Create mock repository
        mockUserRepository = {
            findAll: mock(() => Promise.resolve([])),
            findById: mock(() => Promise.resolve(mockUser)),
            findByEmail: mock(() => Promise.resolve(null)),
            create: mock(() => Promise.resolve(mockUser)),
        };

        // Create mock context
        mockContext = {
            req: {
                header: mock(() => undefined),
            },
            json: mock((data: any, status?: number) => ({ data, status })),
            set: mock(() => { }),
            get: mock(() => undefined),
        } as any;

        // Create mock next function
        mockNext = mock(() => Promise.resolve());
    });

    describe('createAuthMiddleware', () => {
        it('should authenticate user with valid token', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('test-user-id');
            expect(mockContext.set).toHaveBeenCalledWith('user', {
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            });
            expect(mockNext).toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should return 401 when no Authorization header is provided', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock no Authorization header
            (mockContext.req.header as any).mockReturnValue(undefined);

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue(null);

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith(undefined);
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            }, 401);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
        });

        it('should return 401 when Authorization header format is invalid', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock invalid Authorization header
            (mockContext.req.header as any).mockReturnValue('InvalidFormat token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue(null);

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('InvalidFormat token');
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            }, 401);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
        });

        it('should return 401 when token is expired', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with expired token
            (mockContext.req.header as any).mockReturnValue('Bearer expired-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('expired-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockImplementation(() => {
                    throw new Error('Token has expired');
                });

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer expired-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('expired-token');
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Token has expired'
            }, 401);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should return 401 when token is invalid', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with invalid token
            (mockContext.req.header as any).mockReturnValue('Bearer invalid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('invalid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockImplementation(() => {
                    throw new Error('Invalid token');
                });

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer invalid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('invalid-token');
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Invalid token'
            }, 401);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should return 401 when user is not found in database', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'non-existent-user-id', email: 'test@example.com' });

            // Mock user repository to return null (user not found)
            (mockUserRepository.findById as any).mockResolvedValue(null);

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent-user-id');
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'User not found'
            }, 401);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should return 500 when database error occurs', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            // Mock user repository to throw database error
            (mockUserRepository.findById as any).mockRejectedValue(new Error('Database connection failed'));

            // Mock console.error to avoid test output noise
            const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => { });

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('test-user-id');
            expect(mockContext.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Authentication failed'
            }, 500);
            expect(mockNext).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should attach user context without password hash', async () => {
            const authMiddleware = createAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            await authMiddleware(mockContext, mockNext);

            expect(mockContext.set).toHaveBeenCalledWith('user', {
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            });

            // Verify password hash is not included
            const setCall = (mockContext.set as any).mock.calls[0];
            expect(setCall[1]).not.toHaveProperty('passwordHash');

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });
    });

    describe('createOptionalAuthMiddleware', () => {
        it('should authenticate user with valid token', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('test-user-id');
            expect(mockContext.set).toHaveBeenCalledWith('user', {
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            });
            expect(mockNext).toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should continue without authentication when no token is provided', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock no Authorization header
            (mockContext.req.header as any).mockReturnValue(undefined);

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue(null);

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith(undefined);
            expect(mockNext).toHaveBeenCalled();
            expect(mockContext.set).not.toHaveBeenCalled();
            expect(mockUserRepository.findById).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
        });

        it('should continue without authentication when token is invalid', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with invalid token
            (mockContext.req.header as any).mockReturnValue('Bearer invalid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('invalid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockImplementation(() => {
                    throw new Error('Invalid token');
                });

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer invalid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('invalid-token');
            expect(mockNext).toHaveBeenCalled();
            expect(mockContext.set).not.toHaveBeenCalled();
            expect(mockUserRepository.findById).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should continue without authentication when token is expired', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with expired token
            (mockContext.req.header as any).mockReturnValue('Bearer expired-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('expired-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockImplementation(() => {
                    throw new Error('Token has expired');
                });

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer expired-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('expired-token');
            expect(mockNext).toHaveBeenCalled();
            expect(mockContext.set).not.toHaveBeenCalled();
            expect(mockUserRepository.findById).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should continue without authentication when user is not found', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'non-existent-user-id', email: 'test@example.com' });

            // Mock user repository to return null (user not found)
            (mockUserRepository.findById as any).mockResolvedValue(null);

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent-user-id');
            expect(mockNext).toHaveBeenCalled();
            expect(mockContext.set).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });

        it('should continue without authentication when database error occurs', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            // Mock user repository to throw database error
            (mockUserRepository.findById as any).mockRejectedValue(new Error('Database connection failed'));

            // Mock console.error to avoid test output noise
            const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => { });

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
            expect(extractTokenSpy).toHaveBeenCalledWith('Bearer valid-token');
            expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token');
            expect(mockUserRepository.findById).toHaveBeenCalledWith('test-user-id');
            expect(mockNext).toHaveBeenCalled();
            expect(mockContext.set).not.toHaveBeenCalled();

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should attach user context without password hash when authentication succeeds', async () => {
            const optionalAuthMiddleware = createOptionalAuthMiddleware({ userRepository: mockUserRepository });

            // Mock Authorization header with valid token
            (mockContext.req.header as any).mockReturnValue('Bearer valid-token');

            // Mock JWT utilities
            const extractTokenSpy = spyOn(JWTUtils, 'extractTokenFromHeader')
                .mockReturnValue('valid-token');
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' });

            await optionalAuthMiddleware(mockContext, mockNext);

            expect(mockContext.set).toHaveBeenCalledWith('user', {
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            });

            // Verify password hash is not included
            const setCall = (mockContext.set as any).mock.calls[0];
            expect(setCall[1]).not.toHaveProperty('passwordHash');

            extractTokenSpy.mockRestore();
            verifyTokenSpy.mockRestore();
        });
    });
});