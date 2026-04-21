import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Local dev expects `postgres://patronage:patronage@localhost:5433/patronage` (docker container `patronage-pg`).",
    );
  }
  _pool = new Pool({
    connectionString: url,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  _db = drizzle(_pool, { schema });
  return _db;
}

function needsSsl(url: string) {
  return (
    url.includes("sslmode=require") ||
    /neon\.tech|supabase|aws|render|rlwy\.net|railway/.test(url)
  );
}

export { schema };
