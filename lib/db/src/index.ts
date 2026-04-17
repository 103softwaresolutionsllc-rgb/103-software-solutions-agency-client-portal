import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("Database connected");
  } else {
    console.log("DATABASE_URL not set, using mock database");
    // Create mock database object for development
    pool = null;
    db = null;
  }
}

// Initialize database on import
initializeDatabase();

export { pool, db };
export * from "./schema";
