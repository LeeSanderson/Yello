import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import { DatabaseConnection } from "./connection";
import * as schema from "./schema";

export async function createInMemoryDatabaseConnection(): Promise<DatabaseConnection> {
  const client = new PGlite();
  const db = drizzle({ client })
  const { apply } = await pushSchema(schema, db);
  await apply();
  return db as any as DatabaseConnection;
}
