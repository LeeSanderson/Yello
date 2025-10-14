import type { DatabaseConnection } from '../db/connection';
import { workspaces } from '../db/schema';

export type Workspace = { 
  id: string; 
  name: string; 
  slug: string; 
  description: string | null; 
  createdAt: Date | null; 
  updatedAt: Date | null; 
};

export class WorkspaceRepository {
  constructor(private db: DatabaseConnection) {}

  async findAll(): Promise<Workspace[]> {
    return await this.db.select().from(workspaces);
  }
}