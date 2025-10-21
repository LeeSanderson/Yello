import { Container } from './Container';
import { createDefaultDatabaseConnection, type DatabaseConnection } from '../db/connection';
import { UserRepository } from '../repositories/UserRepository';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { UserService } from '../services/UserService';
import { AuthHelper } from '../middleware/AuthHelper';
import { createAuthMiddleware } from '../middleware/auth';

export function setupContainer(): Container {
  const container = new Container();

  // Register database connection
  container.register<DatabaseConnection>('database', () => createDefaultDatabaseConnection());

  // Register repositories
  container.register<UserRepository>('userRepository', () => 
    new UserRepository(container.get<DatabaseConnection>('database'))
  );
  
  container.register<WorkspaceRepository>('workspaceRepository', () => 
    new WorkspaceRepository(container.get<DatabaseConnection>('database'))
  );
  
  container.register<ProjectRepository>('projectRepository', () => 
    new ProjectRepository(container.get<DatabaseConnection>('database'))
  );
  
  container.register<TaskRepository>('taskRepository', () => 
    new TaskRepository(container.get<DatabaseConnection>('database'))
  );

  // Register services
  container.register<UserService>('userService', () => 
    new UserService(container.get<UserRepository>('userRepository'))
  );

  // Register authentication helpers and middleware
  container.register<AuthHelper>('authHelper', () => 
    new AuthHelper(container.get<UserRepository>('userRepository'))
  );

  container.register('authMiddleware', () => 
    createAuthMiddleware(container.get<AuthHelper>('authHelper'))
  );

  return container;
}