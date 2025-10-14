import type { DatabaseConnection } from '../db/connection';
import { tasks } from '../db/schema';

export type Task = { 
  id: string; 
  createdAt: Date | null; 
  updatedAt: Date | null; 
  description: string | null; 
  projectId: string; 
  title: string; 
  status: string; 
  dueDate: Date | null; 
};

export class TaskRepository {
  constructor(private db: DatabaseConnection) {}

  async findAll(): Promise<Task[]> {
    return await this.db.select().from(tasks);
  }
}