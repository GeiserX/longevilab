import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // Also load .env as fallback

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// During build time, DATABASE_URL may not be set - create a stub db
const isBuildTime = process.env.NODE_ENV === "production" && !process.env.DATABASE_URL;

let pool: Pool | null = null;

if (!isBuildTime) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000, // Timeout for new connections
  });
}

// Export db - will be null during build time but that's ok since routes aren't actually called
export const db = pool ? drizzle(pool, { schema }) : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export type Database = typeof db;
