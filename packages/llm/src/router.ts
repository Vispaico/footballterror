/**
 * LLM Router
 *
 * Provider abstraction with ordered fallback chains.
 *
 * Tiers:
 * - default/heavy: LLM_DEFAULT_PROVIDER + OPENROUTER_MODEL1→N chain
 * - small:         NVIDIA chain, rate-limited to 36 RPM (see nvidia-rate-limiter.ts)
 *
 * Every call returns token usage for cost tracking. Failures cascade to the
 * next model in the chain; only when the whole chain fails does the call reject.
 */

import { env, llmChains, computeCostUsd } from "@footballterror/config";
import { createLogger } from "@footballterror/logger";
import { nvidiaRateLimiter } from "./nvidia-rate-limiter.js";

const log = createLogger("llm-router");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** JSON output mode where supported */
  json?: boolean;
  /**
   * Task tier:
   * - "default" — provider/model from LLM_DEFAULT_PROVIDER (OpenRouter chain)
   * - "small"   — cheap/fast tasks → NVIDIA free endpoints (rate-limited 36 RPM)
   */
  tier?: "default" | "small";
  /** Hard timeout per model attempt (ms). Default 60s. */
  timeoutMs?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface CompletionResult {
  content: string;
  usage: TokenUsage;
  /** Which provider:model actually served this request */
  servedBy: string;
  attempts: { target: string; error?: string }[];
}

interface ChainTarget {
  provider: "openrouter" | "nvidia";
  model: string;
  inputPerM?: number;
  outputPerM?: number;
}

function openRouterChain(): ChainTarget[] {
  return llmChains.openrouter.map((e: { model: string; inputPerM?: number; outputPerM?: number }) =>
    ({ provider: "openrouter" as const, model: e.model, inputPerM: e.inputPerM, outputPerM: e.outputPerM }));
}

function nvidiaChain(): ChainTarget[] {
  return llmChains.nvidia.map((e: { model: string; inputPerM?: number; outputPerM?: number }) =>
    ({ provider: "nvidia" as const, model: e.model, inputPerM: e.inputPerM, outputPerM: e.outputPerM }));
}

function resolveChain(tier: "default" | "small"): ChainTarget[] {
  if (tier === "small") {
    const nvidia = nvidiaChain();
    if (nvidia.length > 0) return nvidia;
    log.warn("small tier requested but no NVIDIA models configured — falling back to default");
  }
  return openRouterChain();
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OpenAICompatibleResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/** Call an OpenAI-compatible endpoint (both OpenRouter and NVIDIA integrate API use this shape) */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  target: ChainTarget,
  opts: CompletionOptions,
  isNvidia: boolean
): Promise<CompletionResult> {
  const model = target.model;
  const attempts: { target: string; error?: string }[] = [];
  const maxRetriesOn429 = isNvidia ? 3 : 1;

  for (let attempt = 0; attempt <= maxRetriesOn429; attempt++) {
    if (isNvidia) await nvidiaRateLimiter.acquire((msg) => log.info(msg));

    let resp: Response;
    try {
      resp = await fetchWithTimeout(
        `${baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens ?? 2048,
            ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          }),
        },
        opts.timeoutMs ?? 60_000
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      attempts.push({ target: `${model}`, error });
      throw new FetchAttemptError(attempts, error);
    }

    if (resp.status === 429 && attempt < maxRetriesOn429) {
      if (isNvidia) await nvidiaRateLimiter.backoff((msg) => log.info(msg));
      else await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      const error = `HTTP ${resp.status}: ${body.slice(0, 300)}`;
      attempts.push({ target: model, error });
      throw new FetchAttemptError(attempts, error);
    }

    const data = (await resp.json()) as OpenAICompatibleResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    attempts.push({ target: model });
    const usage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };
    const costUsd = computeCostUsd(usage, target);
    return {
      content,
      servedBy: `${isNvidia ? "nvidia" : "openrouter"}:${model}`,
      attempts,
      usage: costUsd != null ? { ...usage, costUsd } : usage,
    };
  }

  throw new FetchAttemptError(attempts, "unreachable");
}

class FetchAttemptError extends Error {
  constructor(public readonly attempts: { target: string; error?: string }[], message: string) {
    super(message);
    this.name = "FetchAttemptError";
  }
}

/**
 * Run a completion through the fallback chain.
 * Resolves with the first successful result; rejects only if every model fails.
 */
export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  const tier = opts.tier ?? "default";
  const chain = resolveChain(tier);

  if (chain.length === 0) {
    throw new Error(
      `No LLM models configured for tier "${tier}". Set OPENROUTER_MODEL1..N / NVIDIA_MODEL1..N in .env`
    );
  }

  const attempts: { target: string; error?: string }[] = [];

  for (const target of chain) {
    try {
      if (target.provider === "openrouter") {
        if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");
        const result = await callOpenAICompatible(
          "https://openrouter.ai/api/v1",
          env.OPENROUTER_API_KEY!,
          target,
          opts,
          false
        );
        log.info({ servedBy: result.servedBy, tokens: result.usage.totalTokens }, "LLM completion");
        return result;
      }
      if (target.provider === "nvidia") {
        if (!env.NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY not set");
        const result = await callOpenAICompatible(
          "https://integrate.api.nvidia.com/v1",
          env.NVIDIA_API_KEY!,
          target,
          opts,
          true
        );
        log.info({ servedBy: result.servedBy, tokens: result.usage.totalTokens }, "LLM completion (nvidia)");
        return result;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attemptErrors =
        err instanceof FetchAttemptError ? err.attempts.filter((a) => a.error) : [{ target: target.model, error: message }];
      attempts.push(...attemptErrors);
      log.warn({ model: target.model, error: message }, "LLM chain member failed — trying next");
    }
  }

  throw new Error(`All LLM models failed for tier "${tier}": ${JSON.stringify(attempts)}`);
}

/** Small-task helper — routes to the NVIDIA free tier automatically */
export async function completeSmall(opts: Omit<CompletionOptions, "tier">): Promise<CompletionResult> {
  return complete({ ...opts, tier: "small" });
}
