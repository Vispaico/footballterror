import { config } from "dotenv";
import path from "node:path";

// Load .env from project root (try multiple locations).
// NOTE: dotenv does NOT throw for a missing file — it returns { error }.
// Only stop at the first candidate that actually exists.
const candidates = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), ".env"),
];
import fs from "node:fs";
for (const p of candidates) {
  if (fs.existsSync(p)) {
    config({ path: p });
    break;
  }
}

/** Parse an ordered model chain from env vars like PREFIX_MODEL1, PREFIX_MODEL2, ... */
export function parseModelChain(prefix: string, source: Record<string, string | undefined> = process.env): string[] {
  const entries: { idx: number; value: string }[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (!value) continue;
    const m = key.match(new RegExp(`^${prefix}MODEL(\\d+)`));
    if (m) entries.push({ idx: parseInt(m[1]!, 10), value: value! });
  }
  return entries.sort((a, b) => a.idx - b.idx).map((e) => e.value);
}

export const env = {
  // App
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  WEB_PORT: parseInt(process.env.WEB_PORT ?? "3000", 10),
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",

  // Database
  DATABASE_URL: process.env.DATABASE_URL ?? "sqlite:./data/footballterror.db",

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // ─── Sports Data APIs ─────────────────────────────────────────
  // api-football.com (100 req/day free)
  API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY,
  API_FOOTBALL_BASE_URL: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",

  // football-data.org (10 req/min free, delayed scores)
  FOOTBALL_DATA_KEY: process.env.FOOTBALL_DATA_KEY,
  FOOTBALL_DATA_BASE_URL: process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4",

  // football-charts.com (5000 req/day free, all leagues, probabilities/results)
  FOOTBALL_CHARTS_KEY: process.env.FOOTBALL_CHARTS_KEY,
  FOOTBALL_CHARTS_BASE_URL: process.env.FOOTBALL_CHARTS_BASE_URL ?? "https://footballcharts-backend.onrender.com/api/v1",

  // ─── Email (Hostinger SMTP) ───────────────────────────────────
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "587", 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM ?? process.env.SMTP_USER,

  // ─── LLM Providers ────────────────────────────────────────────
  LLM_DEFAULT_PROVIDER: (process.env.LLM_DEFAULT_PROVIDER ?? "openrouter").toLowerCase(),
  LLM_DEFAULT_MODEL: process.env.LLM_DEFAULT_MODEL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,

  // Feature flags
  AUTO_PUBLISH_ENABLED: process.env.AUTO_PUBLISH_ENABLED === "true",
  LIVE_DATA_ENABLED: process.env.LIVE_DATA_ENABLED === "true",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
} as const;

export type Env = typeof env;

/** Ordered fallback chains parsed from *_MODEL<N> vars */
export const llmChains = {
  openrouter: parseModelChain("OPENROUTER_"),
  nvidia: parseModelChain("NVIDIA_"),
};
