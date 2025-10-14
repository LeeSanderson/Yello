# Dependency Injection Guidelines

This document provides comprehensive guidelines for implementing dependency injection patterns in the Yellow project to avoid global state and improve testability, maintainability, and modularity.

## Core Principles

### Avoid Global State
- **Never use global database connections**: Avoid importing `db` directly from connection modules
- **No global service instances**: Don't create singleton services that hold global state
- **Eliminate static dependencies**: Avoid static imports of stateful objects
- **Inject all dependencies**: Pass dependencies as constructor arguments

### Dependency Injection Benefits
- **Testability**: Easy to mock dependencies in unit tests
- **Flexibility**: Different implementations can be injected for different environments
- **Maintainability**: Clear dependency relationships and easier refactoring
- **Isolation**: Components don't depend on global state or specific implementations

## Implementation Patterns

### Repository Pattern with Dependency Injection

#### ❌ Avoid: Global Database Import
```typescript
// DON'T DO THIS
import { db } from '../db/connection';

export class UserRepository {
  async findById(id: string) {
    return await db.select().from(users).where(eq(users.id, id));
  }
}
```

#### ✅ Preferred: Injected Database Connection
```typescript
// DO THIS INSTEAD
import type { Database } from '../types/database';

export class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string) {
    return await this.db.select().from(users).where(eq(users.id, id));
  }
}
```

### Service Layer with Dependency Injection

#### ❌ Avoid: Direct Repository Instantiation
```typescript
// DON'T DO THIS
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  private userRepository = new UserRepository(); // Global dependency

  async getUser(id: string) {
    return await this.userRepository.findById(id);
  }
}
```

#### ✅ Preferred: Injected Dependencies
```typescript
// DO THIS INSTEAD
import type { IUserRepository } from '../interfaces/IUserRepository';

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getUser(id: string) {
    return await this.userRepository.findById(id);
  }
}
```

### Controller Pattern with Dependency Injection

#### ❌ Avoid: Service Instantiation in Controllers
```typescript
// DON'T DO THIS
import { UserService } from '../services/UserService';

export class UserController {
  private userService = new UserService(); // Creates dependency chain

  async getUser(c: Context) {
    const user = await this.userService.getUser(c.req.param('id'));
    return c.json(user);
  }
}
```

#### ✅ Preferred: Injected Services
```typescript
// DO THIS INSTEAD
import type { IUserService } from '../interfaces/IUserService';

export class UserController {
  constructor(private userService: IUserService) {}

  async getUser(c: Context) {
    const user = await this.userService.getUser(c.req.param('id'));
    return c.json(user);
  }
}
```

## Dependency Container Pattern

### Simple Container Implementation
```typescript
// src/container/Container.ts
export class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not registered`);
    }

    const instance = factory();
    this.services.set(name, instance);
    return instance;
  }
}
```

### Container Configuration
```typescript
// src/container/setup.ts
import { Container } from './Container';
import { UserRepository } from '../repositories/UserRepository';
import { UserService } from '../services/UserService';
import { UserController } from '../controllers/UserController';
import { createDatabaseConnection } from '../db/connection';

export function setupContainer(): Container {
  const container = new Container();

  // Register database connection
  container.register('database', () => createDatabaseConnection());

  // Register repositories
  container.register('userRepository', () => 
    new UserRepository(container.get('database'))
  );

  // Register services
  container.register('userService', () => 
    new UserService(container.get('userRepository'))
  );

  // Register controllers
  container.register('userController', () => 
    new UserController(container.get('userService'))
  );

  return container;
}
```

## Interface-Based Design

### Define Clear Interfaces
```typescript
// src/interfaces/IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: CreateUserData): Promise<User>;
  update(id: string, userData: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

// src/interfaces/IUserService.ts
export interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(id: string, userData: UpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
```

### Database Connection Factory
```typescript
// src/db/connection.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export function createDatabaseConnection(config?: DatabaseConfig) {
  const connectionString = config?.connectionString || 
    process.env.DATABASE_URL || 
    'postgresql://yellow_user:yellow_password@localhost:5432/yellow_dev';

  const pool = new Pool({
    connectionString,
    max: config?.maxConnections || 20,
    idleTimeoutMillis: config?.idleTimeoutMs || 30000,
    connectionTimeoutMillis: config?.connectionTimeoutMs || 2000,
  });

  return drizzle(pool);
}

export async function testConnection(db: ReturnType<typeof createDatabaseConnection>) {
  try {
    // Test the connection using the injected db instance
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
```

## Testing with Dependency Injection

### Mock Dependencies in Tests
```typescript
// src/services/UserService.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { UserService } from './UserService';
import type { IUserRepository } from '../interfaces/IUserRepository';

describe('UserService', () => {
  it('should get user by id', async () => {
    // Create mock repository
    const mockUserRepository: IUserRepository = {
      findById: mock(() => Promise.resolve({ id: '1', email: 'test@example.com' })),
      findByEmail: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    };

    // Inject mock dependency
    const userService = new UserService(mockUserRepository);
    
    const user = await userService.getUser('1');
    
    expect(user).toEqual({ id: '1', email: 'test@example.com' });
    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
  });
});
```

### Test Database Configuration
```typescript
// src/test/setup.ts
import { createDatabaseConnection } from '../db/connection';

export function createTestDatabase() {
  return createDatabaseConnection({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/yellow_test',
    maxConnections: 5,
  });
}
```

## Route Handler Integration

### Hono with Dependency Injection
```typescript
// src/routes/users.ts
import { Hono } from 'hono';
import type { Container } from '../container/Container';
import type { IUserController } from '../interfaces/IUserController';

export function createUserRoutes(container: Container) {
  const app = new Hono();
  const userController = container.get<IUserController>('userController');

  app.get('/:id', (c) => userController.getUser(c));
  app.post('/', (c) => userController.createUser(c));
  app.put('/:id', (c) => userController.updateUser(c));
  app.delete('/:id', (c) => userController.deleteUser(c));

  return app;
}
```

### Application Setup
```typescript
// src/index.ts
import { Hono } from 'hono';
import { setupContainer } from './container/setup';
import { createUserRoutes } from './routes/users';

const container = setupContainer();
const app = new Hono();

// Mount routes with injected dependencies
app.route('/api/users', createUserRoutes(container));

export default app;
```

## Middleware with Dependency Injection

### Authentication Middleware
```typescript
// src/middleware/auth.ts
import type { Context, Next } from 'hono';
import type { IAuthService } from '../interfaces/IAuthService';

export function createAuthMiddleware(authService: IAuthService) {
  return async (c: Context, next: Next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    try {
      const user = await authService.validateToken(token);
      c.set('user', user);
      await next();
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
}
```

## Configuration Management

### Environment-Based Configuration
```typescript
// src/config/index.ts
export interface AppConfig {
  database: {
    connectionString: string;
    maxConnections: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  server: {
    port: number;
    cors: {
      origin: string[];
    };
  };
}

export function loadConfig(): AppConfig {
  return {
    database: {
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/yellow_dev',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'default-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    server: {
      port: parseInt(process.env.PORT || '3000'),
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
      },
    },
  };
}
```

## Migration Strategy

### Refactoring Existing Code
When updating existing code to use dependency injection:

1. **Identify global dependencies**: Find all imports of global state (like `db`)
2. **Create interfaces**: Define interfaces for all dependencies
3. **Update constructors**: Add dependency parameters to constructors
4. **Update tests**: Inject mock dependencies in tests
5. **Update application setup**: Use container or manual injection at application root

### Gradual Migration
- Start with new features using dependency injection
- Refactor existing code incrementally
- Maintain backward compatibility during transition
- Update tests to use dependency injection patterns

## Best Practices

### Do's
- **Always inject dependencies** through constructors or method parameters
- **Use interfaces** to define dependency contracts
- **Create factory functions** for complex object creation
- **Test with mock dependencies** to ensure proper isolation
- **Keep constructors simple** - only store dependencies, no business logic
- **Use dependency containers** for complex applications with many dependencies

### Don'ts
- **Don't import global state** like database connections directly
- **Don't create dependencies inside classes** - always inject them
- **Don't use static methods** that depend on global state
- **Don't mix dependency injection with global state** - be consistent
- **Don't over-engineer** - use simple patterns for simple applications

### Performance Considerations
- **Lazy initialization**: Only create expensive dependencies when needed
- **Singleton pattern**: Reuse expensive-to-create dependencies
- **Connection pooling**: Use connection pools for database connections
- **Caching**: Cache frequently used dependencies appropriately

This dependency injection approach ensures that the Yellow project maintains clean architecture, high testability, and flexible deployment options while avoiding the pitfalls of global state management.