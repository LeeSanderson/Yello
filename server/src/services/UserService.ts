import type { IUserRepository, User, CreateUserData } from '../repositories/UserRepository';
import { PasswordUtils, JWTUtils } from '../utils';

export type RegisterUserData = {
  name: string;
  email: string;
  password: string;
};

export type LoginUserData = {
  email: string;
  password: string;
};

export type UserResponse = {
  id: string;
  name: string;
  email: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type LoginResponse = {
  user: UserResponse;
  token: string;
};

export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface IUserService {
  register(userData: RegisterUserData): Promise<UserResponse>;
  login(userData: LoginUserData): Promise<LoginResponse>;
}

export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository) {}

  async register(userData: RegisterUserData): Promise<UserResponse> {
    const { name, email, password } = userData;

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        passwordValidation.errors.join(', '),
        'INVALID_PASSWORD'
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AuthenticationError(
        'User with this email already exists',
        'EMAIL_ALREADY_EXISTS'
      );
    }

    // Hash password
    let passwordHash: string;
    try {
      passwordHash = await PasswordUtils.hashPassword(password);
    } catch (error) {
      throw new Error('Failed to process password');
    }

    // Create user
    const createUserData: CreateUserData = {
      name,
      email,
      passwordHash,
    };

    try {
      const user = await this.userRepository.create(createUserData);
      
      // Return user data without password hash
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      // Handle database errors (e.g., unique constraint violations)
      if (error instanceof Error && error.message.includes('unique')) {
        throw new AuthenticationError(
          'User with this email already exists',
          'EMAIL_ALREADY_EXISTS'
        );
      }
      throw new Error('Failed to create user account');
    }
  }

  async login(userData: LoginUserData): Promise<LoginResponse> {
    const { email, password } = userData;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError(
        'Invalid email or password',
        'INVALID_CREDENTIALS'
      );
    }

    // Compare password
    let isPasswordValid: boolean;
    try {
      isPasswordValid = await PasswordUtils.comparePassword(password, user.passwordHash);
    } catch (error) {
      throw new Error('Authentication failed');
    }

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Invalid email or password',
        'INVALID_CREDENTIALS'
      );
    }

    // Generate JWT token
    let token: string;
    try {
      token = JWTUtils.generateToken(user.id, user.email);
    } catch (error) {
      throw new Error('Failed to generate authentication token');
    }

    // Return user data and token
    const userResponse: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: userResponse,
      token,
    };
  }
}