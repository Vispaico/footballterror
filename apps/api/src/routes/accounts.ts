/**
 * Auth + follows + alerts — Express router
 *
 * Mounted by apps/api. Session tokens in Authorization: Bearer <token>.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import pg from "pg";

export const accountsRouter: ReturnType<typeof Router> = Router();

// Lazy pool — created on first use
let pool: pg.Pool | null = null;
function db(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool!;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

interface AuthedRequest extends Request {
  userId?: string;
  userRole?: string;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { rows } = await db().query(
    `SELECT s.user_id, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  if (rows.length === 0) { res.status(401).json({ error: "Invalid or expired session" }); return; }
  req.userId = rows[0]!.user_id;
  req.userRole = rows[0]!.role;
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Register ─────────────────────────────────────────────────────────────────
accountsRouter.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!EMAIL_RE.test(String(email ?? ""))) { res.status(400).json({ error: "Valid email required" }); return; }
    if (typeof password !== "string" || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const { rows } = await db().query(
      `INSERT INTO users (email, password_hash, display_name, verification_token)
       VALUES ($1,$2,$3,$4) RETURNING id, email, display_name`,
      [String(email).toLowerCase(), hashPassword(password), displayName ?? null, verificationToken]
    );
    const user = rows[0];

    // TODO (email delivery): send verification link via packages/mailer once SMTP confirmed
    console.log(`[auth] registered ${user.email} — verification token generated`);

    res.status(201).json({ userId: user.id, email: user.email, message: "Account created. Verification email pending SMTP setup." });
  } catch (e: any) {
    if (e.code === "23505") { res.status(409).json({ error: "Email already registered" }); return; }
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
accountsRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const { rows } = await db().query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [String(email ?? "").toLowerCase()]
    );
    if (rows.length === 0 || !verifyPassword(String(password ?? ""), rows[0]!.password_hash)) {
      // constant-ish time: still burn a verify cycle
      verifyPassword("dummy", "scrypt:aa:" + "0".repeat(128));
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
    await db().query(`INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,$3)`, [token, rows[0]!.id, expires]);
    res.json({ token, expiresAt: expires.toISOString() });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
accountsRouter.post("/logout", requireAuth as any, async (req: AuthedRequest, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  await db().query(`DELETE FROM sessions WHERE token = $1`, [token]);
  res.json({ ok: true });
});

// ─── Me ───────────────────────────────────────────────────────────────────────
accountsRouter.get("/me", requireAuth as any, async (req: AuthedRequest, res) => {
  const { rows } = await db().query(
    `SELECT id, email, display_name, role, email_verified, created_at FROM users WHERE id = $1`,
    [req.userId]
  );
  res.json({ user: rows[0] });
});

// ─── Follows ──────────────────────────────────────────────────────────────────
accountsRouter.get("/follows", requireAuth as any, async (req: AuthedRequest, res) => {
  const { rows } = await db().query(
    `SELECT c.id, c.name FROM club_follows f JOIN clubs c ON c.id = f.club_id WHERE f.user_id = $1 ORDER BY c.name`,
    [req.userId]
  );
  res.json({ follows: rows });
});

accountsRouter.post("/follows/:clubId", requireAuth as any, async (req: AuthedRequest, res) => {
  await db().query(
    `INSERT INTO club_follows (user_id, club_id) VALUES ($1,$2)
     ON CONFLICT (user_id, club_id) DO NOTHING`,
    [req.userId, req.params.clubId]
  );
  res.json({ ok: true });
});

accountsRouter.delete("/follows/:clubId", requireAuth as any, async (req: AuthedRequest, res) => {
  await db().query(`DELETE FROM club_follows WHERE user_id = $1 AND club_id = $2`, [req.userId, req.params.clubId]);
  res.json({ ok: true });
});

// ─── Alerts ───────────────────────────────────────────────────────────────────
accountsRouter.get("/alerts", requireAuth as any, async (req: AuthedRequest, res) => {
  const { rows } = await db().query(
    `SELECT id, type, fixture_id, payload, scheduled_for, sent_at, status, created_at
     FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.userId]
  );
  res.json({ alerts: rows });
});

/**
 * Create an alert rule. v0 semantics: when a followed club's match verdict is
 * posted (or a power move occurs), an alert row is scheduled.
 */
accountsRouter.post("/alerts", requireAuth as any, async (req: AuthedRequest, res) => {
  const { type, clubId, minTerrorIndex } = req.body ?? {};
  const valid = ["prediction_shift", "match_imminent", "verdict_posted", "power_move"];
  if (!valid.includes(type)) { res.status(400).json({ error: `type must be one of ${valid.join(", ")}` }); return; }

  // Store rule in payload; the alert engine materializes concrete alerts
  const { rows } = await db().query(
    `INSERT INTO alerts (user_id, type, payload, status)
     VALUES ($1,$2,$3,'pending') RETURNING id, type, payload, status`,
    [req.userId, type, JSON.stringify({ clubId: clubId ?? null, minTerrorIndex: Number(minTerrorIndex) || null })]
  );
  res.status(201).json({ alert: rows[0] });
});

// ─── Admin: kill switch (spec §24) ────────────────────────────────────────────
accountsRouter.get("/admin/flags", requireAuth as any, async (req: AuthedRequest, res) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const { rows } = await db().query(`SELECT key, value, updated_at FROM system_flags`);
  res.json({ flags: rows });
});

accountsRouter.put("/admin/flags/:key", requireAuth as any, async (req: AuthedRequest, res) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const { value } = req.body ?? {};
  if (typeof value !== "string") { res.status(400).json({ error: "value must be a string" }); return; }
  await db().query(
    `INSERT INTO system_flags (key, value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
    [req.params.key, value]
  );
  res.json({ ok: true, key: req.params.key, value });
});
