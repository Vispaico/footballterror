import { config } from "dotenv";
import path from "node:path";

// Load .env from project root
config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), "../.env") });
config({ path: ".env" });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "sqlite:./data/footballterror.db",
  REDIS_URL: process.env.REDIS_URL,
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  AUTO_PUBLISH_ENABLED: process.env.AUTO_PUBLISH_ENABLED === "true",
  LLM_DEFAULT_PROVIDER: process.env.LLM_DEFAULT_PROVIDER ?? "openai",
  LLM_DEFAULT_MODEL: process.env.LLM_DEFAULT_MODEL ?? "gpt-4o-mini",
  LLM_API_KEY: process.env.LLM_API_KEY,
  STATSBOMB_API_KEY: process.env.STATSBOMB_API_KEY,
} as const;

export type Env = typeof env;
