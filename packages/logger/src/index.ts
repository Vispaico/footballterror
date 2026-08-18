import pino from "pino";
import { env } from "@footballterror/config";

const levelMap: Record<string, string> = {
  development: "debug",
  production: "info",
  test: "warn",
};

export function createLogger(name: string) {
  return pino({
    name,
    level: levelMap[env.NODE_ENV] ?? env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
