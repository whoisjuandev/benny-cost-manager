import { runMigrations } from "./migrate";
import { seedDatabase } from "./seed";

let initialized = false;

export function ensureDatabaseReady() {
  if (initialized) {
    return;
  }

  runMigrations();
  seedDatabase();
  initialized = true;
}
