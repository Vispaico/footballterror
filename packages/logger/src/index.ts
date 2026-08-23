import { createRequire } from "node:module";
import pino from "pino";
import { env } from "@footballterror/config";

/**
 * Structured logger.
 *
 * JSON by default (production-safe, parseable).
 * Pretty output only when LOG_PRETTY=true AND pino-pretty is installed.
 * Never logs secrets — callers are responsible for redacting credentials.
 */
export function createLogger(name: string) {
  const usePretty = env.NODE_ENV === "development" && process.env.LOG_PRETTY === "true";

  if (usePretty) {
    let prettyAvailable = false;
    try {
      createRequire(import.meta.url).resolve("pino-pretty");
      prettyAvailable = true;
    } catch {
      prettyAvailable = false;
    }
    if (prettyAvailable) {
      return pino({
        name,
        level: env.LOG_LEVEL,
        transport: { target: "pino-pretty", options: { colorize: true } },
      });
    }
  }

  return pino({ name, level: process.env.LOG_LEVEL ?? "info" });
}

export type Logger = ReturnType<typeof createLogger>;
