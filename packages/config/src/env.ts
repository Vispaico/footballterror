import { config } from "dotenv";
import path from "node:path";

// Load .env from project root (try multiple locations)
const candidates = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), ".env"),
];
for (const p of candidates) {
  try { config({ path: p }); break; } catch {}
}

export const env = {
  // App
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  WEB_PORT: parseInt(process.env.WEB_PORT ?? "3000", 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL ?? "sqlite:./data/footballterror.db",

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // API Keys
  API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY,
  API_FOOTBALL_BASE_URL: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
  FOOTBALL_DATA_KEY: process.env.FOOTBALL_DATA_KEY,
  FOOTBALL_DATA_BASE_URL: process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4",

  // LLM
  LLM_DEFAULT_PROVIDER: process.env.LLM_DEFAULT_PROVIDER ?? "openai",
  LLM_DEFAULT_MODEL: process.env.LLM_DEFAULT_MODEL ?? "gpt-4o-mini",
  LLM_API_KEY: process.env.LLM_API_KEY,

  // Feature flags
  AUTO_PUBLISH_ENABLED: process.env.AUTO_PUBLISH_ENABLED === "true",
  LIVE_DATA_ENABLED: process.env.LIVE_DATA_ENABLED === "true",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
} as const;

export type Env = typeof env;
