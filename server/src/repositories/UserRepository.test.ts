import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { User, UserRepository, CreateUserData } from './UserRepository';
import type { DatabaseConnection } from '../db/connection';

describe('UserRepository', () => {
  let mockDb: any;
  let userRepository: UserRepository;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockDb = {};
    userRepository = new UserRepository(mockDb as DatabaseConnection);
  });

  describe('findAll', () => {
    it('should find all users using injected database connection', async () => {
      // Mock the query result
      const mockUsers: User[] = [
        { id: '1', email: 'user1@example.com', name: 'user1', passwordHash: 'dummy', createdAt: null, updatedAt: null },
        { id: '2', email: 'user2@example.com', name: 'user2', passwordHash: 'dummy', createdAt: null, updatedAt: null }
      ];

      // Create mock query builder that matches Drizzle's interface
      const mockQueryBuilder = {
        from: mock(() => Promise.resolve(mockUsers))
      };

      // Create mock database connection
      mockDb.select = mock(() => mockQueryBuilder);

      const users = await userRepository.findAll();

      expect(users).toEqual(mockUsers);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      const mockQueryBuilder = {
        from: mock(() => Promise.resolve([]))
      };

      mockDb.select = mock(() => mockQueryBuilder);

      const users = await userRepository.findAll();

      expect(users).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find user by id when user exists', async () => {
      const mockQueryBuilder = {
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([mockUser]))
          }))
        }))
      };

      mockDb.select = mock(() => mockQueryBuilder);

      const user = await userRepository.findById('test-user-id');

      expect(user).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null when user does not exist', async () => {
      const mockQueryBuilder = {
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([]))
          }))
        }))
      };

      mockDb.select = mock(() => mockQueryBuilder);

      const user = await userRepository.findById('non-existent-id');

      expect(user).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email when user exists', async () => {
      const mockQueryBuilder = {
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([mockUser]))
          }))
        }))
      };

      mockDb.select = mock(() => mockQueryBuilder);

      const user = await userRepository.findByEmail('test@example.com');

      expect(user).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null when user with email does not exist', async () => {
      const mockQueryBuilder = {
        from: mock(() => ({
          where: mock(() => ({
            limit: mock(() => Promise.resolve([]))
          }))
        }))
      };

      mockDb.select = mock(() => mockQueryBuilder);

      const user = await userRepository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new user and return the created user', async () => {
      const createUserData: CreateUserData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };

      const mockInsertBuilder = {
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockUser]))
        }))
      };

      mockDb.insert = mock(() => mockInsertBuilder);

      const createdUser = await userRepository.create(createUserData);

      expect(createdUser).toEqual(mockUser);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });
    });

    it('should handle user creation with all required fields', async () => {
      const createUserData: CreateUserData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        passwordHash: 'super-secure-hash',
      };

      const expectedUser: User = {
        id: 'new-user-id',
        name: 'John Doe',
        email: 'john.doe@example.com',
        passwordHash: 'super-secure-hash',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      };

      const mockInsertBuilder = {
        values: mock(() => ({
          returning: mock(() => Promise.resolve([expectedUser]))
        }))
      };

      mockDb.insert = mock(() => mockInsertBuilder);

      const createdUser = await userRepository.create(createUserData);

      expect(createdUser).toEqual(expectedUser);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsertBuilder.values).toHaveBeenCalledWith(createUserData);
    });
  });
});