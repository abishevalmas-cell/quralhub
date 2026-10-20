import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export { schema };
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

// Production: DATABASE_URL points at Postgres (Supabase, Neon or a server in Kazakhstan).
// Development and demo previews: an embedded PGlite database, migrated automatically.
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: Number(process.env.DATABASE_POOL_SIZE || 5), prepare: false });
    const db = drizzle(client, { schema });
    if (process.env.DB_AUTO_MIGRATE === "1") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS });
    }
    return db as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // Serverless hosts (Vercel) only allow writes to /tmp; data there lasts as long as the instance (demo only).
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/tetix-pglite" : path.join(process.cwd(), ".data", "pglite"));
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

const globalForDb = globalThis as unknown as { tetixDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.tetixDb) {
    globalForDb.tetixDb = connect().catch((error) => {
      globalForDb.tetixDb = undefined;
      throw error;
    });
  }
  return globalForDb.tetixDb;
}

// In-memory database for tests; every call returns a fresh, migrated instance.
export async function createMemoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}
