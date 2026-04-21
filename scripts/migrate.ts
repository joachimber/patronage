import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({
    connectionString: url,
    ssl: /rlwy\.net|railway|neon|supabase/.test(url)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const db = drizzle(pool);
  console.log("Applying migrations from lib/db/migrations…");
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  console.log("Done.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
