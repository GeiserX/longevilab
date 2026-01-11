import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // Also load .env as fallback

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout for new connections
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
