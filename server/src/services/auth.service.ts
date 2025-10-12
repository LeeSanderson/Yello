import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
}

export interface LoginUserData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  token: string;
}

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

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Failed to compare password');
    }
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(userId: string, email: string): string {
    try {
      return jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );
    } catch (error) {
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token', 'TOKEN_INVALID');
      }
      throw new AuthenticationError('Token verification failed', 'TOKEN_ERROR');
    }
  }

  /**
   * Login a user with email and password
   */
  static async login(loginData: LoginUserData): Promise<AuthResponse> {
    const { email, password } = loginData;

    try {
      // Find user by email
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user = existingUsers[0];
      if (!user) {
        throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Compare password
      let isPasswordValid: boolean;
      try {
        isPasswordValid = await this.comparePassword(password, user.passwordHash);
      } catch (error) {
        // Re-throw password comparison errors directly
        throw error;
      }
      
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Generate JWT token
      let token: string;
      try {
        token = this.generateToken(user.id, user.email);
      } catch (error) {
        // Re-throw token generation errors directly
        throw error;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        },
        token,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      // Re-throw specific errors from password comparison and token generation
      if (error instanceof Error && 
          (error.message.includes('Failed to compare password') || 
           error.message.includes('Failed to generate token'))) {
        throw error;
      }
      
      throw new Error('Login failed');
    }
  }

  /**
   * Register a new user
   */
  static async register(userData: RegisterUserData): Promise<AuthResponse> {
    const { email, password, name } = userData;

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new ValidationError('Email already exists', 'EMAIL_EXISTS');
      }

      // Hash the password
      const passwordHash = await this.hashPassword(password);

      // Create the user
      const newUsers = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
        });

      const newUser = newUsers[0];
      if (!newUser) {
        throw new ValidationError('Failed to create user', 'USER_CREATION_FAILED');
      }

      // Generate JWT token
      const token = this.generateToken(newUser.id, newUser.email);

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: newUser.createdAt?.toISOString() || new Date().toISOString(),
        },
        token,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      // Handle database constraint violations
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new ValidationError('Email already exists', 'EMAIL_EXISTS');
      }
      
      throw new Error('Registration failed');
    }
  }
}