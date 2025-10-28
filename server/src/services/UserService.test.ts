import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';
import { UserService, AuthenticationError } from './UserService';
import type { IUserRepository, User } from '../repositories/UserRepository';
import { PasswordUtils, JWTUtils } from '../utils';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Create mock repository
    mockUserRepository = {
      findAll: mock(() => Promise.resolve([])),
      findById: mock(() => Promise.resolve(null)),
      findByEmail: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User)),
    };

    userService = new UserService(mockUserRepository);
  });

  describe('register', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'validpassword123',
    };

    it('should register a new user with valid data', async () => {
      // Mock password hashing
      const hashPasswordSpy = spyOn(PasswordUtils, 'hashPassword')
        .mockResolvedValue('hashed-password');
      
      // Mock password validation
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });

      const result = await userService.register(validUserData);

      expect(result).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(validatePasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(hashPasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });

      // Restore mocks
      hashPasswordSpy.mockRestore();
      validatePasswordSpy.mockRestore();
    });

    it('should throw ValidationError for invalid password', async () => {
      // Mock password validation to return invalid
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ 
          isValid: false, 
          errors: ['Password must be at least 8 characters long'] 
        });

      const invalidUserData = {
        ...validUserData,
        password: 'short',
      };

      await expect(userService.register(invalidUserData)).rejects.toThrow(AuthenticationError);
      await expect(userService.register(invalidUserData)).rejects.toThrow('Password must be at least 8 characters long');

      expect(validatePasswordSpy).toHaveBeenCalledWith('short');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();

      validatePasswordSpy.mockRestore();
    });

    it('should throw AuthenticationError when email already exists', async () => {
      // Mock password validation
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });

      // Mock existing user
      (mockUserRepository.findByEmail as any).mockResolvedValue({
        id: 'existing-user-id',
        email: 'test@example.com',
        name: 'Existing User',
        passwordHash: 'existing-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(userService.register(validUserData)).rejects.toThrow(AuthenticationError);
      await expect(userService.register(validUserData)).rejects.toThrow('User with this email already exists');

      expect(validatePasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      validatePasswordSpy.mockRestore();
    });

    it('should handle password hashing errors', async () => {
      // Mock password validation
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });

      // Mock password hashing to throw error
      const hashPasswordSpy = spyOn(PasswordUtils, 'hashPassword')
        .mockRejectedValue(new Error('Hashing failed'));

      await expect(userService.register(validUserData)).rejects.toThrow('Failed to process password');

      expect(validatePasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(hashPasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      hashPasswordSpy.mockRestore();
      validatePasswordSpy.mockRestore();
    });

    it('should handle database unique constraint errors', async () => {
      // Mock password validation and hashing
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });
      const hashPasswordSpy = spyOn(PasswordUtils, 'hashPassword')
        .mockResolvedValue('hashed-password');

      // Mock database error with unique constraint violation
      (mockUserRepository.create as any).mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      await expect(userService.register(validUserData)).rejects.toThrow(AuthenticationError);
      await expect(userService.register(validUserData)).rejects.toThrow('User with this email already exists');

      expect(validatePasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(hashPasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });

      hashPasswordSpy.mockRestore();
      validatePasswordSpy.mockRestore();
    });

    it('should handle general database errors', async () => {
      // Mock password validation and hashing
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });
      const hashPasswordSpy = spyOn(PasswordUtils, 'hashPassword')
        .mockResolvedValue('hashed-password');

      // Mock general database error
      (mockUserRepository.create as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(userService.register(validUserData)).rejects.toThrow('Failed to create user account');

      expect(validatePasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(hashPasswordSpy).toHaveBeenCalledWith('validpassword123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });

      hashPasswordSpy.mockRestore();
      validatePasswordSpy.mockRestore();
    });

    it('should not return password hash in response', async () => {
      // Mock password validation and hashing
      const validatePasswordSpy = spyOn(PasswordUtils, 'validatePasswordStrength')
        .mockReturnValue({ isValid: true, errors: [] });
      const hashPasswordSpy = spyOn(PasswordUtils, 'hashPassword')
        .mockResolvedValue('hashed-password');

      const result = await userService.register(validUserData);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      hashPasswordSpy.mockRestore();
      validatePasswordSpy.mockRestore();
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'validpassword123',
    };

    const mockUser: User = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login user with valid credentials', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockResolvedValue(true);

      // Mock JWT token generation
      const generateTokenSpy = spyOn(JWTUtils, 'generateToken')
        .mockReturnValue('jwt-token');

      const result = await userService.login(validLoginData);

      expect(result).toEqual({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        token: 'jwt-token',
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePasswordSpy).toHaveBeenCalledWith('validpassword123', 'hashed-password');
      expect(generateTokenSpy).toHaveBeenCalledWith('test-user-id', 'test@example.com');

      comparePasswordSpy.mockRestore();
      generateTokenSpy.mockRestore();
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      // Mock user repository to return null (user not found)
      (mockUserRepository.findByEmail as any).mockResolvedValue(null);

      await expect(userService.login(validLoginData)).rejects.toThrow(AuthenticationError);
      await expect(userService.login(validLoginData)).rejects.toThrow('Invalid email or password');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw AuthenticationError for invalid password', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison to return false
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockResolvedValue(false);

      await expect(userService.login(validLoginData)).rejects.toThrow(AuthenticationError);
      await expect(userService.login(validLoginData)).rejects.toThrow('Invalid email or password');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePasswordSpy).toHaveBeenCalledWith('validpassword123', 'hashed-password');

      comparePasswordSpy.mockRestore();
    });

    it('should handle password comparison errors', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison to throw error
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockRejectedValue(new Error('Comparison failed'));

      await expect(userService.login(validLoginData)).rejects.toThrow('Authentication failed');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePasswordSpy).toHaveBeenCalledWith('validpassword123', 'hashed-password');

      comparePasswordSpy.mockRestore();
    });

    it('should handle JWT token generation errors', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison to return true
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockResolvedValue(true);

      // Mock JWT token generation to throw error
      const generateTokenSpy = spyOn(JWTUtils, 'generateToken')
        .mockImplementation(() => {
          throw new Error('Token generation failed');
        });

      await expect(userService.login(validLoginData)).rejects.toThrow('Failed to generate authentication token');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePasswordSpy).toHaveBeenCalledWith('validpassword123', 'hashed-password');
      expect(generateTokenSpy).toHaveBeenCalledWith('test-user-id', 'test@example.com');

      comparePasswordSpy.mockRestore();
      generateTokenSpy.mockRestore();
    });

    it('should not return password hash in login response', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockResolvedValue(true);

      // Mock JWT token generation
      const generateTokenSpy = spyOn(JWTUtils, 'generateToken')
        .mockReturnValue('jwt-token');

      const result = await userService.login(validLoginData);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      comparePasswordSpy.mockRestore();
      generateTokenSpy.mockRestore();
    });

    it('should return JWT token in login response', async () => {
      // Mock user repository to return user
      (mockUserRepository.findByEmail as any).mockResolvedValue(mockUser);

      // Mock password comparison
      const comparePasswordSpy = spyOn(PasswordUtils, 'comparePassword')
        .mockResolvedValue(true);

      // Mock JWT token generation
      const generateTokenSpy = spyOn(JWTUtils, 'generateToken')
        .mockReturnValue('jwt-token-12345');

      const result = await userService.login(validLoginData);

      expect(result.token).toBe('jwt-token-12345');
      expect(typeof result.token).toBe('string');

      comparePasswordSpy.mockRestore();
      generateTokenSpy.mockRestore();
    });
  });
});