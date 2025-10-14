import { Container } from './Container';
import { createDefaultDatabaseConnection, type DatabaseConnection } from '../db/connection';
import { UserRepository } from '../repositories/UserRepository';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';

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

  return container;
}