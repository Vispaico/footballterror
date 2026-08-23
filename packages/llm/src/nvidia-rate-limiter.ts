/**
 * NVIDIA API Rate Limiter
 *
 * Rule (from AGENTS.md "NVIDIA API Rate Limiting Rule"):
 * - Max 36 requests/minute (free tier is 40 RPM — we stay under with margin)
 * - Wait ~1.7s between requests (60/36)
 * - On 429: wait 5 seconds before retrying
 * - Log all rate-limit waits to the console
 */

const MAX_RPM = 36;
const MIN_INTERVAL_MS = Math.ceil(60_000 / MAX_RPM); // 1667ms → ceil 1667
const RATE_LIMIT_BACKOFF_MS = 5_000;
const WINDOW_MS = 60_000;

export class NvidiaRateLimiter {
  private requestTimes: number[] = [];
  private lastRequestAt = 0;

  /** Wait until the next request is allowed. Logs waits. */
  async acquire(log: (msg: string) => void = console.log): Promise<void> {
    const now = Date.now();

    // 1. Enforce minimum spacing between requests (~1.7s)
    const sinceLast = now - this.lastRequestAt;
    if (this.lastRequestAt > 0 && sinceLast < MIN_INTERVAL_MS) {
      const wait = MIN_INTERVAL_MS - sinceLast;
      log(`[nvidia-ratelimit] spacing wait ${wait}ms`);
      await sleep(wait);
    }

    // 2. Enforce sliding-window RPM cap
    this.requestTimes = this.requestTimes.filter((t) => Date.now() - t < WINDOW_MS);
    if (this.requestTimes.length >= MAX_RPM) {
      const oldest = this.requestTimes[0]!;
      const wait = WINDOW_MS - (Date.now() - oldest);
      if (wait > 0) {
        log(`[nvidia-ratelimit] window wait ${wait}ms (${this.requestTimes.length}/${MAX_RPM} in last minute)`);
        await sleep(wait);
      }
    }

    this.lastRequestAt = Date.now();
    this.requestTimes.push(Date.now());
  }

  /** Backoff after a 429 response. */
  async backoff(log: (msg: string) => void = console.log): Promise<void> {
    log(`[nvidia-ratelimit] 429 received — backing off ${RATE_LIMIT_BACKOFF_MS}ms`);
    this.lastRequestAt = 0; // force full spacing wait on next acquire
    await sleep(RATE_LIMIT_BACKOFF_MS);
  }

  get pendingInWindow(): number {
    this.requestTimes = this.requestTimes.filter((t) => Date.now() - t < WINDOW_MS);
    return this.requestTimes.length;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const nvidiaRateLimiter = new NvidiaRateLimiter();
