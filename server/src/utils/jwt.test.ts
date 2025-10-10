import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { JWTUtils } from './jwt';

describe('JWTUtils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Set up test environment variables
        process.env.JWT_SECRET = 'test-secret-key-for-testing';
        process.env.JWT_EXPIRES_IN = '1h';
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const userId = 'user123';
            const email = 'test@example.com';

            const token = JWTUtils.generateToken(userId, email);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
        });

        it('should generate different tokens for different users', () => {
            const token1 = JWTUtils.generateToken('user1', 'user1@example.com');
            const token2 = JWTUtils.generateToken('user2', 'user2@example.com');

            expect(token1).not.toBe(token2);
        });

        it('should throw error when JWT_SECRET is not set', () => {
            delete process.env.JWT_SECRET;

            expect(() => {
                JWTUtils.generateToken('user123', 'test@example.com');
            }).toThrow('JWT_SECRET environment variable is required');
        });
    });

    describe('verifyToken', () => {
        it('should verify and decode a valid token', () => {
            const userId = 'user123';
            const email = 'test@example.com';

            const token = JWTUtils.generateToken(userId, email);
            const decoded = JWTUtils.verifyToken(token);

            expect(decoded.userId).toBe(userId);
            expect(decoded.email).toBe(email);
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => {
                JWTUtils.verifyToken(invalidToken);
            }).toThrow('Invalid token');
        });

        it('should throw error for malformed token', () => {
            const malformedToken = 'not-a-jwt-token';

            expect(() => {
                JWTUtils.verifyToken(malformedToken);
            }).toThrow('Invalid token');
        });

        it('should throw error when JWT_SECRET is not set', () => {
            const token = JWTUtils.generateToken('user123', 'test@example.com');
            delete process.env.JWT_SECRET;

            expect(() => {
                JWTUtils.verifyToken(token);
            }).toThrow('Token verification failed');
        });

        it('should throw error for token signed with different secret', () => {
            const token = JWTUtils.generateToken('user123', 'test@example.com');
            process.env.JWT_SECRET = 'different-secret';

            expect(() => {
                JWTUtils.verifyToken(token);
            }).toThrow('Invalid token');
        });
    });

    describe('extractTokenFromHeader', () => {
        it('should extract token from valid Bearer header', () => {
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
            const header = `Bearer ${token}`;

            const extracted = JWTUtils.extractTokenFromHeader(header);

            expect(extracted).toBe(token);
        });

        it('should return null for undefined authorization header', () => {
            const extracted = JWTUtils.extractTokenFromHeader(undefined);

            expect(extracted).toBeNull();
        });

        it('should return null for empty authorization header', () => {
            const extracted = JWTUtils.extractTokenFromHeader('');

            expect(extracted).toBeNull();
        });

        it('should return null for malformed authorization header', () => {
            const extracted = JWTUtils.extractTokenFromHeader('InvalidHeader');

            expect(extracted).toBeNull();
        });

        it('should return null for non-Bearer authorization header', () => {
            const extracted = JWTUtils.extractTokenFromHeader('Basic dXNlcjpwYXNz');

            expect(extracted).toBeNull();
        });

        it('should return null for Bearer header without token', () => {
            const extracted = JWTUtils.extractTokenFromHeader('Bearer');

            expect(extracted).toBeNull();
        });

        it('should return null for Bearer header with extra parts', () => {
            const extracted = JWTUtils.extractTokenFromHeader('Bearer token extra');

            expect(extracted).toBeNull();
        });
    });

    describe('environment configuration', () => {
        it('should use default expiration when JWT_EXPIRES_IN is not set', () => {
            delete process.env.JWT_EXPIRES_IN;

            const token = JWTUtils.generateToken('user123', 'test@example.com');
            const decoded = JWTUtils.verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe('user123');
        });

        it('should use custom expiration when JWT_EXPIRES_IN is set', () => {
            process.env.JWT_EXPIRES_IN = '2h';

            const token = JWTUtils.generateToken('user123', 'test@example.com');
            const decoded = JWTUtils.verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe('user123');
        });
    });
});