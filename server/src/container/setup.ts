import { Container } from './Container';
import { createDefaultDatabaseConnection, type DatabaseConnection } from '../db/connection';
import { IUserRepository, UserRepository } from '../repositories/UserRepository';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { IUserService, UserService } from '../services/UserService';
import { AuthHelper, IAuthHelper } from '../middleware/AuthHelper';
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
  container.register<IUserService>('userService', () => 
    new UserService(container.get<IUserRepository>('userRepository'))
  );

  // Register authentication helpers and middleware
  container.register<IAuthHelper>('authHelper', () => 
    new AuthHelper(container.get<IUserRepository>('userRepository'))
  );

  container.register('authMiddleware', () => 
    createAuthMiddleware(container.get<IAuthHelper>('authHelper'))
  );

  return container;
}