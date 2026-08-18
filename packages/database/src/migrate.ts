import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Running migrations...');
  const db = getDb();

  try {
    migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../drizzle'),
    });
    console.log('Migrations complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
