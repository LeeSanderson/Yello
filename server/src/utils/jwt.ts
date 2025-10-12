import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class JWTUtils {
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  /**
   * Generate a JWT token
   */
  static generateToken(userId: string, email: string, expiresIn: string = '24h'): string {
    const secret = this.getJWTSecret();
    return jwt.sign(
      { userId, email },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload {
    const secret = this.getJWTSecret();
    try {
      return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authorization: string | undefined): string | null {
    if (!authorization) {
      return null;
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}