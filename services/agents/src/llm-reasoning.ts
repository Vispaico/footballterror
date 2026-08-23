/**
 * LLM-backed agent reasoning
 *
 * Deterministic agents produce the DATA; the LLM produces the INTERPRETATION.
 * Rules enforced here:
 * - Numbers in prompts come only from computed evidence (never generated)
 * - Output is validated JSON against AgentObservation shape
 * - Small tier (NVIDIA free) for simple interpretation; default tier for synthesis
 * - On any LLM failure we fall back to deterministic-only observations
 */

import { completeSmall, complete } from "@footballterror/llm";
import type { ChatMessage } from "@footballterror/llm";
import type { EvidenceType } from "@footballterror/football-schema";

export interface LLMObservation {
  evidenceType: EvidenceType;
  claim: string;
  confidence: number;
}

const VALID_TYPES: EvidenceType[] = ["FACT", "MODEL_OUTPUT", "FORECAST", "INFERENCE", "OPINION", "UNKNOWN"];

/** Validate + clamp LLM output so a bad response can never enter the pipeline */
export function validateObservations(raw: string): LLMObservation[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const arr = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "observations" in (parsed as any)
      ? (parsed as any).observations
      : [parsed];

  if (!Array.isArray(arr)) return [];

  const out: LLMObservation[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.claim !== "string" || o.claim.length < 8) continue;
    const evidenceType = VALID_TYPES.includes(o.evidenceType as EvidenceType)
      ? (o.evidenceType as EvidenceType)
      : "UNKNOWN";
    const conf = typeof o.confidence === "number" ? Math.min(1, Math.max(0, o.confidence)) : 0.5;
    // Hard cap claim length — no essays in structured observations
    out.push({ evidenceType, claim: o.claim.slice(0, 400), confidence: conf });
  }
  return out.slice(0, 6);
}

/**
 * Interpret statistical evidence via the small tier.
 * Falls back to empty array on failure — callers keep their deterministic observations.
 */
export async function interpretEvidence(
  agentName: string,
  evidenceLines: string[],
  instruction: string
): Promise<LLMObservation[]> {
  if (evidenceLines.length === 0) return [];
  try {
    const result = await completeSmall({
      messages: [
        {
          role: "system",
          content:
            `You are ${agentName}, an analysis agent for FootballTerror, a football intelligence platform. ` +
            `You interpret pre-computed statistics. You MUST NOT invent numbers — only reference figures present in the evidence. ` +
            `Respond ONLY with valid JSON: {"observations":[{"evidenceType":"MODEL_OUTPUT|FACT|FORECAST|INFERENCE|OPINION","claim":"...","confidence":0.0-1.0}]}. ` +
            `Maximum 3 observations. Each claim max 2 sentences.`,
        },
        {
          role: "user",
          content: `INSTRUCTION: ${instruction}\n\nEVIDENCE (computed, verified):\n${evidenceLines.map((l) => `- ${l}`).join("\n")}`,
        },
      ],
      json: true,
      temperature: 0.4,
      maxTokens: 600,
    });
    return validateObservations(result.content);
  } catch {
    return []; // graceful degradation to deterministic output
  }
}

/**
 * Synthesize the final Terror verdict via the default tier (stronger model).
 * Returns null on failure — caller falls back to deterministic verdict.
 */
export async function synthesizeVerdict(
  fixtureLine: string,
  agentClaims: { agentType: string; claim: string; confidence: number }[]
): Promise<{ headline: string; summary: string; keyInsights: string[] } | null> {
  try {
    const result = await complete({
      messages: [
        {
          role: "system",
          content:
            "You are The Terror, chief intelligence agent of FootballTerror. You synthesize other agents' claims into a verdict. " +
            "You NEVER invent facts or numbers — you may only reframe and prioritize what the agents provide. " +
            'Respond ONLY with valid JSON: {"headline":"punchy one-liner","summary":"2-3 sentences","keyInsights":["insight1","insight2","insight3"]}. ' +
            "Headline max 80 chars. Insights must each be traceable to an agent claim.",
        },
        {
          role: "user",
          content:
            `FIXTURE: ${fixtureLine}\n\nAGENT CLAIMS:\n` +
            agentClaims.map((c) => `[${c.agentType} @${Math.round(c.confidence * 100)}%] ${c.claim}`).join("\n"),
        },
      ],
      json: true,
      temperature: 0.6,
      maxTokens: 700,
    });
    const parsed = JSON.parse(result.content) as { headline?: string; summary?: string; keyInsights?: string[] };
    if (!parsed.headline || !parsed.summary) return null;
    return {
      headline: String(parsed.headline).slice(0, 120),
      summary: String(parsed.summary).slice(0, 600),
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.map(String).slice(0, 5) : [],
    };
  } catch {
    return null;
  }
}
