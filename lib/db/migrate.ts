import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { db } from "./client";

export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });
}
