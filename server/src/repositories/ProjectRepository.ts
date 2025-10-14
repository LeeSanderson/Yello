import type { DatabaseConnection } from '../db/connection';
import { projects } from '../db/schema';

export type Project = { 
  id: string; 
  name: string; 
  description: string | null; 
  createdAt: Date | null; 
  updatedAt: Date | null; 
  workspaceId: string; 
};

export class ProjectRepository {
  constructor(private db: DatabaseConnection) {}

  async findAll(): Promise<Project[]> {
    return await this.db.select().from(projects);
  }
}