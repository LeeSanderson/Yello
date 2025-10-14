import { describe, it, expect, mock } from 'bun:test';
import { User, UserRepository } from './UserRepository';
import type { DatabaseConnection } from '../db/connection';

describe('UserRepository', () => {
  it('should find all users using injected database connection', async () => {
    // Mock the query result
    const mockUsers: User[] = [
      { id: '1', email: 'user1@example.com', name: "user1", passwordHash:"dummy", createdAt: null, updatedAt: null },
      { id: '2', email: 'user2@example.com', name: "user2", passwordHash:"dummy", createdAt: null, updatedAt: null }
    ];

    // Create mock query builder that matches Drizzle's interface
    const mockQueryBuilder = {
      from: mock(() => Promise.resolve(mockUsers))
    };

    // Create mock database connection
    const mockDb = {
      select: mock(() => mockQueryBuilder)
    } as unknown as DatabaseConnection;

    // Inject mock dependency
    const userRepository = new UserRepository(mockDb);

    const users = await userRepository.findAll();

    expect(users).toEqual(mockUsers);
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockQueryBuilder.from).toHaveBeenCalled();
  });
});