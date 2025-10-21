import { IUserRepository } from "@/repositories/UserRepository";
import { UserResponse } from "@/services";
import { JWTPayload, JWTUtils } from "@/utils/jwt";
import { Context } from "hono";

export interface IAuthHelper { 
    getTokenFromContext(context: Context): string | null;
    verifyToken(token: string): JWTPayload;
    findUserByToken(token: JWTPayload): Promise<UserResponse | null>;
}

export class AuthHelper implements IAuthHelper {
    constructor(private userRepository: IUserRepository) {}

    getTokenFromContext(context: Context): string | null {
        const authorization = context.req.header('Authorization');
        return  JWTUtils.extractTokenFromHeader(authorization);
    }

    verifyToken(token: string): JWTPayload {
        return JWTUtils.verifyToken(token);
    }

    async findUserByToken(token: JWTPayload): Promise<UserResponse | null> {
        const user = await this.userRepository.findById(token.userId);
        return user == null ? null : {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

}