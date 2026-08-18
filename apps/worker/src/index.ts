import { createLogger } from "@footballterror/logger";

const log = createLogger("worker");

log.info("FootballTerror Worker starting...");
log.info("Worker ready — waiting for jobs");
