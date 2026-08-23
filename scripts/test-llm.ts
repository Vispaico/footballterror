/**
 * Smoke test: LLM router + fallback chains + NVIDIA rate limiter
 * Run: node_modules/.bin/tsx scripts/test-llm.ts
 */

import { complete, completeSmall } from "../packages/llm/src/router.js";
import { llmChains } from "../packages/config/src/env.js";

async function main() {
  console.log("── LLM Chain Configuration ──────────────────────────────");
  console.log("OpenRouter chain:", llmChains.openrouter.join(" → ") || "(empty)");
  console.log("NVIDIA chain:   ", llmChains.nvidia.join(" → ") || "(empty)");
  console.log();

  // ─── Test 1: Default tier (OpenRouter chain) ─────────────────
  console.log("── Test 1: Default tier (OpenRouter) ────────────────────");
  try {
    const result = await complete({
      messages: [
        { role: "system", content: "You are the Quant agent for FootballTerror. Reply in one short sentence." },
        { role: "user", content: "Liverpool generated 1.19 xG from 23 shots against Arsenal. Summarize what this suggests about finishing quality." },
      ],
      temperature: 0.5,
      maxTokens: 100,
      tier: "default",
    });
    console.log(`✅ servedBy: ${result.servedBy}`);
    console.log(`   tokens: ${result.usage.totalTokens} (prompt ${result.usage.promptTokens} / completion ${result.usage.completionTokens})`);
    console.log(`   reply: ${result.content.trim().slice(0, 200)}`);
  } catch (err) {
    console.error(`❌ default tier failed:`, err instanceof Error ? err.message : err);
  }
  console.log();

  // ─── Test 2: Small tier (NVIDIA, rate-limited) ────────────────
  console.log("── Test 2: Small tier (NVIDIA, ≤36 RPM enforced) ───────");
  try {
    const start = Date.now();
    const result = await completeSmall({
      messages: [
        { role: "system", content: "Reply with valid JSON only." },
        { role: "user", content: 'Return {"evidenceType":"MODEL_OUTPUT","confidence":0.85,"summary":"<one sentence about xG vs goals>"} for: Liverpool scored 3 goals from 1.19 xG.' },
      ],
      json: true,
      maxTokens: 150,
    });
    console.log(`✅ servedBy: ${result.servedBy}`);
    console.log(`   latency: ${Date.now() - start}ms`);
    console.log(`   tokens: ${result.usage.totalTokens}`);
    console.log(`   reply: ${result.content.trim().slice(0, 200)}`);
  } catch (err) {
    console.error(`❌ small tier failed:`, err instanceof Error ? err.message : err);
  }
  console.log();

  // ─── Test 3: Rate limiter spacing check ──────────────────────
  console.log("── Test 3: NVIDIA rate limiter spacing ──────────────────");
  const { nvidiaRateLimiter } = await import("../packages/llm/src/nvidia-rate-limiter.js");
  const t1 = Date.now();
  await nvidiaRateLimiter.acquire((msg) => console.log(`   ${msg}`));
  await nvidiaRateLimiter.acquire((msg) => console.log(`   ${msg}`));
  const gap = Date.now() - t1;
  console.log(`✅ two acquires took ${gap}ms (expect ≥ ~1667ms spacing between them)`);

  console.log();
  console.log("── Smoke test complete ──────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
