import type { DatabaseConnection } from '../db/connection';
import { users } from '../db/schema';

export type User = { 
  id: string; 
  name: string; 
  email: string; 
  passwordHash: string; 
  createdAt: Date | null; 
  updatedAt: Date | null; 
};

export class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async findAll(): Promise<User[]> {
    return await this.db.select().from(users);
  }
}