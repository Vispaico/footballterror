/**
 * Accounts, follows, alerts — schema migration
 *
 * Adds user accounts (bcrypt password hashing), club follows, and
 * intelligence alerts. Uses the same DATABASE_URL as migrate-to-postgres.
 *
 * Run: node_modules/.bin/tsx scripts/migrate-accounts.ts
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

// Load .env
{
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
    }
  }
}

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',          -- 'user' | 'admin'
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_follows (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                          -- 'prediction_shift' | 'match_imminent' | 'verdict_posted' | 'power_move'
  fixture_id TEXT REFERENCES fixtures(id),
  payload JSONB,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending' | 'sent' | 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_pending ON alerts(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Global kill switch for automated publishing/alerting (spec §24)
CREATE TABLE IF NOT EXISTS system_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO system_flags (key, value) VALUES ('alerts_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;
`;

/** scrypt password hashing (no native deps) */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    console.error("DATABASE_URL must point at Postgres");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected");

  console.log("Creating account tables...");
  await client.query(DDL);

  // Optional: seed admin from env
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = hashPassword(process.env.ADMIN_PASSWORD);
    await client.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, 'Founder', 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin'`,
      [process.env.ADMIN_EMAIL, hash]
    );
    console.log(`Admin seeded: ${process.env.ADMIN_EMAIL}`);
  }

  const { rows } = await client.query(`
    SELECT 'users' t, count(*) FROM users
    UNION ALL SELECT 'club_follows', count(*) FROM club_follows
    UNION ALL SELECT 'alerts', count(*) FROM alerts
    UNION ALL SELECT 'sessions', count(*) FROM sessions
  `);
  console.log("\nAccount schema ready:");
  for (const r of rows) console.log(`  ${r.t}: ${r.count}`);

  await client.end();
}

main().catch((e: any) => {
  console.error(e.code === "ECONNREFUSED" ? "Postgres not reachable at DATABASE_URL" : e.message || e);
  process.exit(1);
});
