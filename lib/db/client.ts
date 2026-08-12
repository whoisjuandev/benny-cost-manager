import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/benny-cost-manager.db";
const sqlite = new Database(databaseUrl);

export const db = drizzle({ client: sqlite, schema });
export { schema };
