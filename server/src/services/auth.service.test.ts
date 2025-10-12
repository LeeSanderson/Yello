import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService, ValidationError, AuthenticationError } from './auth.service';
import { db } from '../db/connection';
import { users } from '../db/schema';

describe('AuthService', () => {
    // Store original functions to restore them
    const originalBcryptHash = bcrypt.hash;
    const originalBcryptCompare = bcrypt.compare;
    const originalJwtSign = jwt.sign;
    const originalJwtVerify = jwt.verify;

    beforeEach(() => {
        // Setup fresh mocks for each test
        spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
        spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
        spyOn(jwt, 'sign').mockReturnValue('test-jwt-token' as never);
        spyOn(jwt, 'verify').mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' } as never);
    });

    afterEach(() => {
        // Restore original functions after each test
        mock.restore();
    });

    describe('hashPassword', () => {
        it('should hash password using bcrypt', async () => {
            const password = 'testpassword123';
            const result = await AuthService.hashPassword(password);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
            expect(result).toBe('hashed-password');
        });

        it('should throw error when bcrypt fails', async () => {
            spyOn(bcrypt, 'hash').mockRejectedValue(new Error('Bcrypt error') as never);

            await expect(AuthService.hashPassword('password')).rejects.toThrow('Failed to hash password');
        });
    });

    describe('comparePassword', () => {
        it('should compare password with hash using bcrypt', async () => {
            const password = 'testpassword123';
            const hash = 'hashed-password';

            const result = await AuthService.comparePassword(password, hash);

            expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
            expect(result).toBe(true);
        });

        it('should throw error when bcrypt compare fails', async () => {
            spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Compare error') as never);

            await expect(AuthService.comparePassword('password', 'hash')).rejects.toThrow('Failed to compare password');
        });
    });

    describe('generateToken', () => {
        it('should generate JWT token with user data', () => {
            const userId = 'test-user-id';
            const email = 'test@example.com';

            const result = AuthService.generateToken(userId, email);

            expect(jwt.sign).toHaveBeenCalledWith(
                { userId, email },
                'your-secret-key-here',
                { expiresIn: '24h' }
            );
            expect(result).toBe('test-jwt-token');
        });

        it('should throw error when JWT signing fails', () => {
            spyOn(jwt, 'sign').mockImplementation(() => {
                throw new Error('JWT error');
            });

            expect(() => AuthService.generateToken('user-id', 'email')).toThrow('Failed to generate token');
        });
    });

    describe('verifyToken', () => {
        it('should verify and decode JWT token', () => {
            const token = 'test-jwt-token';

            const result = AuthService.verifyToken(token);

            expect(jwt.verify).toHaveBeenCalledWith(token, 'your-secret-key-here');
            expect(result).toEqual({ userId: 'test-user-id', email: 'test@example.com' });
        });

        it('should throw AuthenticationError for expired token', () => {
            const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
            spyOn(jwt, 'verify').mockImplementation(() => {
                throw expiredError;
            });

            expect(() => AuthService.verifyToken('expired-token')).toThrow(AuthenticationError);
            expect(() => AuthService.verifyToken('expired-token')).toThrow('Token expired');
        });

        it('should throw AuthenticationError for invalid token', () => {
            const invalidError = new jwt.JsonWebTokenError('Invalid token');
            spyOn(jwt, 'verify').mockImplementation(() => {
                throw invalidError;
            });

            expect(() => AuthService.verifyToken('invalid-token')).toThrow(AuthenticationError);
            expect(() => AuthService.verifyToken('invalid-token')).toThrow('Invalid token');
        });
    });

    describe('register', () => {
        const validUserData = {
            email: 'test@example.com',
            password: 'testpassword123',
            name: 'Test User',
        };

        beforeEach(() => {
            // Mock database operations for registration
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([])), // No existing user
                    })),
                })),
            } as any);

            spyOn(db, 'insert').mockReturnValue({
                values: mock(() => ({
                    returning: mock(() => Promise.resolve([{
                        id: 'test-user-id',
                        email: 'test@example.com',
                        name: 'Test User',
                        createdAt: new Date('2024-01-01T00:00:00Z'),
                    }])),
                })),
            } as any);
        });

        it('should register new user successfully', async () => {
            const result = await AuthService.register(validUserData);

            expect(result).toEqual({
                user: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    name: 'Test User',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
                token: 'test-jwt-token',
            });

            expect(bcrypt.hash).toHaveBeenCalledWith('testpassword123', 12);
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 'test-user-id', email: 'test@example.com' },
                'your-secret-key-here',
                { expiresIn: '24h' }
            );
        });

        it('should throw ValidationError when email already exists', async () => {
            // Mock existing user found
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([{ id: 'existing-user' }])), // Existing user
                    })),
                })),
            } as any);

            await expect(AuthService.register(validUserData)).rejects.toThrow(ValidationError);
            await expect(AuthService.register(validUserData)).rejects.toThrow('Email already exists');
        });

        it('should throw ValidationError for database unique constraint violation', async () => {
            // Mock database constraint error
            spyOn(db, 'insert').mockReturnValue({
                values: mock(() => ({
                    returning: mock(() => Promise.reject(new Error('unique constraint violation'))),
                })),
            } as any);

            await expect(AuthService.register(validUserData)).rejects.toThrow(ValidationError);
            await expect(AuthService.register(validUserData)).rejects.toThrow('Email already exists');
        });

        it('should throw error when user creation fails', async () => {
            // Mock empty result from database insert
            spyOn(db, 'insert').mockReturnValue({
                values: mock(() => ({
                    returning: mock(() => Promise.resolve([])), // No user returned
                })),
            } as any);

            await expect(AuthService.register(validUserData)).rejects.toThrow(ValidationError);
            await expect(AuthService.register(validUserData)).rejects.toThrow('Failed to create user');
        });

        it('should throw error for general database failures', async () => {
            // Mock database error
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.reject(new Error('Database connection failed'))),
                    })),
                })),
            } as any);

            await expect(AuthService.register(validUserData)).rejects.toThrow('Registration failed');
        });
    });

    describe('login', () => {
        const validLoginData = {
            email: 'test@example.com',
            password: 'testpassword123',
        };

        const mockUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            passwordHash: 'hashed-password',
            createdAt: new Date('2024-01-01T00:00:00Z'),
        };

        beforeEach(() => {
            // Reset bcrypt compare mock to return true by default
            spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
        });

        it('should login user successfully with valid credentials', async () => {
            // Mock user found in database
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([mockUser])),
                    })),
                })),
            } as any);

            const result = await AuthService.login(validLoginData);

            expect(result).toEqual({
                user: {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    name: 'Test User',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
                token: 'test-jwt-token',
            });

            expect(bcrypt.compare).toHaveBeenCalledWith('testpassword123', 'hashed-password');
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: 'test-user-id', email: 'test@example.com' },
                'your-secret-key-here',
                { expiresIn: '24h' }
            );
        });

        it('should throw AuthenticationError when user does not exist', async () => {
            // Mock no user found
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([])), // No user found
                    })),
                })),
            } as any);

            await expect(AuthService.login(validLoginData)).rejects.toThrow(AuthenticationError);
            await expect(AuthService.login(validLoginData)).rejects.toThrow('Invalid credentials');
        });

        it('should throw AuthenticationError when password is incorrect', async () => {
            // Mock user found but password comparison fails
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([mockUser])),
                    })),
                })),
            } as any);

            spyOn(bcrypt, 'compare').mockResolvedValue(false as never); // Password doesn't match

            await expect(AuthService.login(validLoginData)).rejects.toThrow(AuthenticationError);
            await expect(AuthService.login(validLoginData)).rejects.toThrow('Invalid credentials');
        });

        it('should throw error when password comparison fails', async () => {
            // Mock user found
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([mockUser])),
                    })),
                })),
            } as any);

            // Mock bcrypt compare throwing error
            spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error') as never);

            await expect(AuthService.login(validLoginData)).rejects.toThrow('Failed to compare password');
        });

        it('should throw error for general database failures', async () => {
            // Mock database error
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.reject(new Error('Database connection failed'))),
                    })),
                })),
            } as any);

            await expect(AuthService.login(validLoginData)).rejects.toThrow('Login failed');
        });

        it('should handle JWT token generation failure', async () => {
            // Mock user found and password valid
            spyOn(db, 'select').mockReturnValue({
                from: mock(() => ({
                    where: mock(() => ({
                        limit: mock(() => Promise.resolve([mockUser])),
                    })),
                })),
            } as any);

            // Mock JWT sign failure
            spyOn(jwt, 'sign').mockImplementation(() => {
                throw new Error('JWT error');
            });

            await expect(AuthService.login(validLoginData)).rejects.toThrow('Failed to generate token');
        });
    });
});