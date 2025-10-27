import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context, Next, MiddlewareHandler } from 'hono';
import { setupContainer } from '../container/setup';
import type { IUserService, UserResponse } from '../services/UserService';
import type { UserRepository } from '../repositories/UserRepository';
import type { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import type { ProjectRepository } from '../repositories/ProjectRepository';
import type { TaskRepository } from '../repositories/TaskRepository';

// Test Helper Functions for Protected Routes
const ProtectedRouteTestHelpers = {
  // Data factories
  createValidUser: (overrides = {}): UserResponse => ({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  }),

  createMockData: (type: 'users' | 'workspaces' | 'projects' | 'tasks', count: number = 2) => {
    const baseData = {
      users: { id: '1', name: 'User', email: 'user@example.com' },
      workspaces: { id: '1', name: 'Workspace', description: 'Test workspace' },
      projects: { id: '1', name: 'Project', description: 'Test project' },
      tasks: { id: '1', title: 'Task', description: 'Test task', status: 'todo' }
    };

    return Array.from({ length: count }, (_, i) => ({
      ...baseData[type],
      id: `${i + 1}`,
      name: `${baseData[type].name || baseData[type].title} ${i + 1}`
    }));
  },

  // Mock factories
  createMockAuthMiddleware: (shouldAuthenticate: boolean = true, user?: UserResponse): MiddlewareHandler => {
    if (shouldAuthenticate) {
      const mockUser = user || ProtectedRouteTestHelpers.createValidUser();
      return mock(async (c: Context, next: Next) => {
        c.set('user', mockUser);
        await next();
      });
    } else {
      return mock(async (c: Context, next: Next) => {
        return c.json({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }, 401);
      });
    }
  },

  createMockAuthMiddlewareWithError: (errorType: 'expired' | 'invalid' | 'user_not_found'): MiddlewareHandler => {
    const errorMessages = {
      expired: 'Token has expired',
      invalid: 'Invalid token',
      user_not_found: 'User not found'
    };

    return mock(async (c: Context, next: Next) => {
      return c.json({ 
        error: 'Unauthorized', 
        message: errorMessages[errorType] 
      }, 401);
    });
  },

  // Container setup helpers
  setupTestContainer: (authMiddleware: MiddlewareHandler): any => {
    const container = setupContainer();
    
    // Override the auth middleware with our test version
    container.register('authMiddleware', () => authMiddleware);
    
    // Mock repository methods to return test data
    const userRepository = container.get<UserRepository>('userRepository');
    const workspaceRepository = container.get<WorkspaceRepository>('workspaceRepository');
    const projectRepository = container.get<ProjectRepository>('projectRepository');
    const taskRepository = container.get<TaskRepository>('taskRepository');

    // Mock repository methods
    (userRepository.findAll as any) = mock(() => 
      Promise.resolve(ProtectedRouteTestHelpers.createMockData('users'))
    );
    (workspaceRepository.findAll as any) = mock(() => 
      Promise.resolve(ProtectedRouteTestHelpers.createMockData('workspaces'))
    );
    (projectRepository.findAll as any) = mock(() => 
      Promise.resolve(ProtectedRouteTestHelpers.createMockData('projects'))
    );
    (taskRepository.findAll as any) = mock(() => 
      Promise.resolve(ProtectedRouteTestHelpers.createMockData('tasks'))
    );

    return container;
  },

  // App setup helpers
  setupProtectedApp: (container: any): Hono => {
    const app = new Hono();
    const authMiddleware = container.get<MiddlewareHandler>('authMiddleware');

    // Add CORS middleware (like in main app)
    app.use('*', async (c: Context, next: Next) => {
      c.header('Access-Control-Allow-Origin', '*');
      await next();
    });

    // Health check route (public)
    app.get('/api/health', (c) => c.json({ status: 'ok' }));

    // Protected routes (same as main app)
    app.get('/api/users', authMiddleware, async (c) => {
      try {
        const userRepository = container.get<UserRepository>('userRepository');
        const allUsers = await userRepository.findAll();
        return c.json({ data: allUsers });
      } catch (error) {
        return c.json({ error: 'Failed to fetch users' }, 500);
      }
    });

    app.get('/api/workspaces', authMiddleware, async (c) => {
      try {
        const workspaceRepository = container.get<WorkspaceRepository>('workspaceRepository');
        const allWorkspaces = await workspaceRepository.findAll();
        return c.json({ data: allWorkspaces });
      } catch (error) {
        return c.json({ error: 'Failed to fetch workspaces' }, 500);
      }
    });

    app.get('/api/projects', authMiddleware, async (c) => {
      try {
        const projectRepository = container.get<ProjectRepository>('projectRepository');
        const allProjects = await projectRepository.findAll();
        return c.json({ data: allProjects });
      } catch (error) {
        return c.json({ error: 'Failed to fetch projects' }, 500);
      }
    });

    app.get('/api/tasks', authMiddleware, async (c) => {
      try {
        const taskRepository = container.get<TaskRepository>('taskRepository');
        const allTasks = await taskRepository.findAll();
        return c.json({ data: allTasks });
      } catch (error) {
        return c.json({ error: 'Failed to fetch tasks' }, 500);
      }
    });

    return app;
  },

  // Request helpers
  makeAuthenticatedRequest: async (app: Hono, path: string, token: string = 'valid-token'): Promise<Response> => {
    return app.request(path, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  makeUnauthenticatedRequest: async (app: Hono, path: string): Promise<Response> => {
    return app.request(path, { method: 'GET' });
  },

  // Assertion helpers
  expectSuccessfulProtectedAccess: async (response: Response, expectedDataType: string) => {
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    return data;
  },

  expectUnauthorizedAccess: async (response: Response, expectedMessage?: string) => {
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    if (expectedMessage) {
      expect(data.message).toBe(expectedMessage);
    }
    return data;
  },

  expectPublicAccess: async (response: Response) => {
    expect(response.status).toBe(200);
    const data = await response.json();
    return data;
  }
};

describe('Protected Routes Integration Tests', () => {
  describe('Successful protected route access with valid authentication', () => {
    let app: Hono;
    let container: any;
    let mockUser: UserResponse;

    beforeEach(() => {
      mockUser = ProtectedRouteTestHelpers.createValidUser();
      const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddleware(true, mockUser);
      container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
      app = ProtectedRouteTestHelpers.setupProtectedApp(container);
    });

    it('should allow authenticated access to /api/users', async () => {
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users');
      
      const data = await ProtectedRouteTestHelpers.expectSuccessfulProtectedAccess(response, 'users');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('email');
    });

    it('should allow authenticated access to /api/workspaces', async () => {
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/workspaces');
      
      const data = await ProtectedRouteTestHelpers.expectSuccessfulProtectedAccess(response, 'workspaces');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('description');
    });

    it('should allow authenticated access to /api/projects', async () => {
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/projects');
      
      const data = await ProtectedRouteTestHelpers.expectSuccessfulProtectedAccess(response, 'projects');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('description');
    });

    it('should allow authenticated access to /api/tasks', async () => {
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/tasks');
      
      const data = await ProtectedRouteTestHelpers.expectSuccessfulProtectedAccess(response, 'tasks');
      expect(data.data[0]).toHaveProperty('title');
      expect(data.data[0]).toHaveProperty('status');
    });

    it('should preserve user context in protected routes', async () => {
      // Test that user context is available in the route handler
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users');
      
      expect(response.status).toBe(200);
      // The middleware should have been called and user context set
      const authMiddleware = container.get('authMiddleware');
      expect(authMiddleware).toHaveBeenCalled();
    });

    it('should handle concurrent requests to different protected routes', async () => {
      // Test that multiple protected routes can be accessed simultaneously
      const [usersResponse, workspacesResponse, projectsResponse, tasksResponse] = await Promise.all([
        ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users'),
        ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/workspaces'),
        ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/projects'),
        ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/tasks')
      ]);

      expect(usersResponse.status).toBe(200);
      expect(workspacesResponse.status).toBe(200);
      expect(projectsResponse.status).toBe(200);
      expect(tasksResponse.status).toBe(200);
    });
  });

  describe('Protected route access denial scenarios', () => {
    describe('No authentication provided', () => {
      let app: Hono;
      let container: any;

      beforeEach(() => {
        const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddleware(false);
        container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
        app = ProtectedRouteTestHelpers.setupProtectedApp(container);
      });

      it('should deny unauthenticated access to /api/users', async () => {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(app, '/api/users');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'No authentication token provided');
      });

      it('should deny unauthenticated access to /api/workspaces', async () => {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(app, '/api/workspaces');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'No authentication token provided');
      });

      it('should deny unauthenticated access to /api/projects', async () => {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(app, '/api/projects');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'No authentication token provided');
      });

      it('should deny unauthenticated access to /api/tasks', async () => {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(app, '/api/tasks');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'No authentication token provided');
      });

      it('should still allow access to public routes', async () => {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(app, '/api/health');
        
        await ProtectedRouteTestHelpers.expectPublicAccess(response);
      });
    });

    describe('Expired tokens', () => {
      let app: Hono;
      let container: any;

      beforeEach(() => {
        const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddlewareWithError('expired');
        container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
        app = ProtectedRouteTestHelpers.setupProtectedApp(container);
      });

      it('should deny access with expired token to /api/users', async () => {
        const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users', 'expired-token');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'Token has expired');
      });

      it('should deny access with expired token to /api/workspaces', async () => {
        const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/workspaces', 'expired-token');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'Token has expired');
      });
    });

    describe('Invalid tokens', () => {
      let app: Hono;
      let container: any;

      beforeEach(() => {
        const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddlewareWithError('invalid');
        container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
        app = ProtectedRouteTestHelpers.setupProtectedApp(container);
      });

      it('should deny access with invalid token to /api/projects', async () => {
        const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/projects', 'invalid-token');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'Invalid token');
      });

      it('should deny access with invalid token to /api/tasks', async () => {
        const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/tasks', 'invalid-token');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'Invalid token');
      });
    });

    describe('User not found scenarios', () => {
      let app: Hono;
      let container: any;

      beforeEach(() => {
        const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddlewareWithError('user_not_found');
        container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
        app = ProtectedRouteTestHelpers.setupProtectedApp(container);
      });

      it('should deny access when user is not found', async () => {
        const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users', 'valid-token-but-user-deleted');
        
        await ProtectedRouteTestHelpers.expectUnauthorizedAccess(response, 'User not found');
      });
    });
  });

  describe('Route protection behavior verification', () => {
    let authenticatedApp: Hono;
    let unauthenticatedApp: Hono;

    beforeEach(() => {
      // Setup authenticated app
      const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddleware(true);
      const authenticatedContainer = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
      authenticatedApp = ProtectedRouteTestHelpers.setupProtectedApp(authenticatedContainer);

      // Setup unauthenticated app
      const noAuthMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddleware(false);
      const unauthenticatedContainer = ProtectedRouteTestHelpers.setupTestContainer(noAuthMiddleware);
      unauthenticatedApp = ProtectedRouteTestHelpers.setupProtectedApp(unauthenticatedContainer);
    });

    it('should consistently protect all data routes', async () => {
      const protectedRoutes = ['/api/users', '/api/workspaces', '/api/projects', '/api/tasks'];
      
      // Test authenticated access
      for (const route of protectedRoutes) {
        const authResponse = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(authenticatedApp, route);
        expect(authResponse.status).toBe(200);
      }

      // Test unauthenticated access
      for (const route of protectedRoutes) {
        const unauthResponse = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(unauthenticatedApp, route);
        expect(unauthResponse.status).toBe(401);
      }
    });

    it('should maintain consistent error response format across protected routes', async () => {
      const protectedRoutes = ['/api/users', '/api/workspaces', '/api/projects', '/api/tasks'];
      
      for (const route of protectedRoutes) {
        const response = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(unauthenticatedApp, route);
        
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('message');
        expect(data.error).toBe('Unauthorized');
        expect(typeof data.message).toBe('string');
      }
    });

    it('should not interfere with public routes', async () => {
      // Public routes should work regardless of authentication setup
      const publicRoutes = ['/api/health'];
      
      for (const route of publicRoutes) {
        const authResponse = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(authenticatedApp, route);
        const unauthResponse = await ProtectedRouteTestHelpers.makeUnauthenticatedRequest(unauthenticatedApp, route);
        
        expect(authResponse.status).toBe(200);
        expect(unauthResponse.status).toBe(200);
      }
    });

    it('should handle database errors gracefully in protected routes', async () => {
      // Setup container with failing repository
      const authMiddleware = ProtectedRouteTestHelpers.createMockAuthMiddleware(true);
      const container = ProtectedRouteTestHelpers.setupTestContainer(authMiddleware);
      
      // Make repository throw error
      const userRepository = container.get<UserRepository>('userRepository');
      (userRepository.findAll as any).mockRejectedValue(new Error('Database connection failed'));
      
      const app = ProtectedRouteTestHelpers.setupProtectedApp(container);
      
      const response = await ProtectedRouteTestHelpers.makeAuthenticatedRequest(app, '/api/users');
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch users');
    });
  });
});