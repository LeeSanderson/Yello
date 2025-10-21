import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import { AuthHelper, IAuthHelper } from './AuthHelper';
import type { IUserRepository, User } from '../repositories/UserRepository';
import type { UserResponse } from '../services';
import { JWTPayload, JWTUtils } from '../utils/jwt';
import { Context } from 'hono';

describe('AuthHelper', () => {
    let authHelper: IAuthHelper;
    let mockUserRepository: IUserRepository;

    const mockUser: User = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    const mockJWTPayload: JWTPayload = {
        userId: 'user-123',
        email: 'john@example.com',
    };

    const expectedUserResponse: UserResponse = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    const createMockContext = (authToken: string | null): Context => {
        const mockContext = {
            req: {
                header: mock(() => authToken ? `Bearer ${authToken}` : null),
            },
        } as unknown as Context;

        return mockContext;
    }

    beforeEach(() => {
        // Create mock user repository
        mockUserRepository = {
            findAll: mock(() => Promise.resolve([])),
            findById: mock(() => Promise.resolve(mockUser)),
            findByEmail: mock(() => Promise.resolve(mockUser)),
            create: mock(() => Promise.resolve(mockUser)),
        };

        // Create AuthHelper instance with injected dependencies
        authHelper = new AuthHelper(mockUserRepository);
    });

    afterEach(() => {
        // Restore all mocks to prevent interference between tests
        mock.restore();
    });

    describe('getTokenFromContext', () => {
        it('should extract token from valid Authorization header', () => {
            const result = authHelper.getTokenFromContext(createMockContext('valid-token'));
            expect(result).toBe('valid-token');
        });

        it('should return null when Authorization header is missing', () => {
            const result = authHelper.getTokenFromContext(createMockContext(null));

            expect(result).toBeNull();
        });
    });

    describe('verifyToken', () => {
        it('should return JWTUtils token payload', () => {
            const verifyTokenSpy = spyOn(JWTUtils, 'verifyToken')
                .mockReturnValue(mockJWTPayload);

            const result = authHelper.verifyToken('any-token');

            expect(result).toEqual(mockJWTPayload);
            expect(verifyTokenSpy).toHaveBeenCalled();
        });
    });

    describe('findUserByToken', () => {
        it('should find user by token payload and return user response', async () => {
            const result = await authHelper.findUserByToken(mockJWTPayload);

            expect(result).toEqual(expectedUserResponse);
            expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
        });
    });
});