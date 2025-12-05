import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                        process.env.DATABASE_URL.includes('neon.') ||
                        process.env.USE_NEON === 'true';

let pool: NeonPool | pg.Pool;
let db: ReturnType<typeof neonDrizzle> | ReturnType<typeof pgDrizzle>;

if (isNeonDatabase) {
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool as NeonPool, schema });
} else {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle({ client: pool as pg.Pool, schema });
}

export { pool, db };