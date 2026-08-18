import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema/index.js';
import path from 'node:path';
import fs from 'node:fs';

let _db: ReturnType<typeof createDb> | null = null;

function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'sqlite:./data/footballterror.db';
  const dbFile = url.replace('sqlite:', '');
  return path.resolve(dbFile);
}

function createDb() {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

/** Get or create the singleton database connection */
export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export { schema };
export type AppDatabase = ReturnType<typeof getDb>;
