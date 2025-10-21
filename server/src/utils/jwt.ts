import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';

export interface JWTPayload {
    userId: string;
    email: string;
}

export class JWTUtils {
    private static getSecret(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        return secret;
    }

    private static getExpiresIn(): StringValue {
        return '24h';
    }

    /**
     * Generate a JWT token for a user
     */
    static generateToken(userId: string, email: string): string {
        const payload: JWTPayload = {
            userId,
            email,
        };


        const options: SignOptions = {
            expiresIn: this.getExpiresIn(),
        };

        return jwt.sign(payload, this.getSecret(), options);
    }

    /**
     * Verify and decode a JWT token
     */
    static verifyToken(token: string): JWTPayload {
        try {
            const decoded = jwt.verify(token, this.getSecret()) as JWTPayload;
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
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