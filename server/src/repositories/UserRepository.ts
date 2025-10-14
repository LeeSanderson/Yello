import type { DatabaseConnection } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export type User = { 
  id: string; 
  name: string; 
  email: string; 
  passwordHash: string; 
  createdAt: Date | null; 
  updatedAt: Date | null; 
};

export type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
};

export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: CreateUserData): Promise<User>;
}

export class UserRepository implements IUserRepository {
  constructor(private db: DatabaseConnection) {}

  async findAll(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  }

  async create(userData: CreateUserData): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        passwordHash: userData.passwordHash,
      })
      .returning();
    
    return result[0];
  }
}