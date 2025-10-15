import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { User, UserRepository, CreateUserData } from './UserRepository';
import type { DatabaseConnection } from '@/db/connection';
import { users } from '@/db/schema';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';

describe('UserRepository', () => {
  let mockDb: DatabaseConnection;
  let userRepository: UserRepository;

  const testUser: User = {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const nonExistantUserId = "6aa85f64-5717-4562-b3fc-2c963f66aff3";

  beforeEach(async () => {    
    mockDb = await createInMemoryDatabaseConnection();

    userRepository = new UserRepository(mockDb);
  });

  describe('findAll', async () => {
    it('should find all users using injected database connection', async () => {
      // Mock the query result
      const testUsers = [
        { email: 'user1@example.com', name: 'user1', passwordHash: 'dummy' },
        { email: 'user2@example.com', name: 'user2', passwordHash: 'dummy' }
      ];

      await mockDb.insert(users).values(testUsers)

      const foundUsers = await userRepository.findAll();

      expect(foundUsers).toMatchObject(testUsers);
    });

    it('should return empty array when no users exist', async () => {
      const users = await userRepository.findAll();
      expect(users).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find user by id when user exists', async () => {
      await mockDb.insert(users).values(testUser)
      const user = await userRepository.findById(testUser.id);
      expect(user).toEqual(testUser);
    });

    it('should return null when user does not exist', async () => {
      const user = await userRepository.findById(nonExistantUserId);
      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email when user exists', async () => {
      await mockDb.insert(users).values(testUser)
      const user = await userRepository.findByEmail('test@example.com');
      expect(user).toEqual(testUser);
    });

    it('should return null when user with email does not exist', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should handle user creation with all required fields', async () => {
      const createUserData: CreateUserData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        passwordHash: 'super-secure-hash',
      };

      const createdUser = await userRepository.create(createUserData);

      expect(createdUser).toMatchObject(createUserData);
      expect(createdUser.id).not.toBeNull();
      expect(createdUser.createdAt).not.toBeNull();
      expect(createdUser.updatedAt).not.toBeNull();
    });
  });
});