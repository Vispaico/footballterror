/**
 * Agent Analysis Batch — runs Quant + Gaffer + Historian + Contrarian + Terror
 * over historical matches using LLM reasoning.
 *
 * Designed for the free LLM window (e.g. Minimax M3 until Sept 4):
 *   MINIMAX_API_KEY + MINIMAX_MODEL env vars route through the same
 *   OpenAI-compatible interface as OpenRouter/NVIDIA.
 *
 * Processes matches with event data, writes agent outputs to:
 *   data/db/agent-analysis.jsonl  (one line per match)
 *
 * Idempotent: skips matches already analyzed unless FORCE=1.
 * Rate-limit friendly: configurable delay between LLM calls.
 *
 * Run: node_modules/.bin/tsx scripts/run-agent-batch.ts [--limit=20] [--offset=0]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_DIR = path.join(ROOT, "data/db");
const EVENTS_DIR = path.join(ROOT, "data/statsbomb/data/events");

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.MINIMAX_API_KEY ?? process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1";
const MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M3";
const DELAY_MS = parseInt(process.env.AGENT_BATCH_DELAY_MS ?? "2000", 10);
const FORCE = process.env.FORCE === "1";

if (!API_KEY) {
  console.error("Set MINIMAX_API_KEY (or OPENROUTER_API_KEY) in .env");
  process.exit(1);
}

// ─── LLM helper ───────────────────────────────────────────────────────────────

async function llm(messages: { role: string; content: string }[], json = false): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.5,
          max_tokens: 1200,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (resp.status === 429) {
        console.log(`  [429] waiting 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
      const data: any = await resp.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return "";
}

function parseJson(raw: string): any | null {
  try {
    // strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ─── Evidence extraction (deterministic — numbers NEVER come from the LLM) ────

function extractEvidence(events: any[], fixture: any): Record<string, string> {
  function teamStats(teamId: number) {
    let xG = 0, shots = 0, sot = 0, pp = 0, pc = 0, press = 0, tk = 0, intc = 0, fouls = 0, yc = 0;
    for (const e of events) {
      if (e.team?.id !== teamId) continue;
      switch (e.type?.name) {
        case "Shot": shots++; if (e.shot?.statsbomb_xg != null) xG += e.shot.statsbomb_xg; if (["Saved", "Off T", "Wayward"].includes(e.shot?.outcome?.name)) sot++; break;
        case "Pass": if (e.pass?.outcome?.name === "Complete" && e.pass.end_location && e.location && e.pass.end_location[0] - e.location[0] > 10) pp++; break;
        case "Carry": if (e.carry?.end_location && e.location && e.carry.end_location[0] - e.location[0] > 10) pc++; break;
        case "Pressure": press++; break;
        case "Duel": tk++; break;
        case "Interception": intc++; break;
        case "Foul Committed": fouls++; break;
        case "Card": if (["Yellow Card"].includes(e.foul_committed?.card?.name)) yc++; break;
      }
    }
    return { xG: Math.round(xG * 100) / 100, shots, sot, pp, pc, press, tk, intc, fouls, yc };
  }

  const homeId = Number(fixture.homeTeamId.split(":").pop());
  const awayId = Number(fixture.awayTeamId.split(":").pop());
  const h = teamStats(homeId);
  const a = teamStats(awayId);

  return {
    result: `${fixture.homeTeamName} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeamName}`,
    home_xg: `${h.xG} xG from ${h.shots} shots (${h.sot} on target)`,
    away_xg: `${a.xG} xG from ${a.shots} shots (${a.sot} on target)`,
    home_pressing: `${h.press} pressures, ${h.tk} tackles, ${h.intc} interceptions`,
    away_pressing: `${a.press} pressures, ${a.tk} tackles, ${a.intc} interceptions`,
    home_progression: `${h.pp} progressive passes, ${h.pc} progressive carries`,
    away_progression: `${a.pp} progressive passes, ${a.pc} progressive carries`,
    discipline: `fouls ${h.fouls}-${a.fouls}, yellow cards ${h.yc}-${a.yc}`,
  };
}

// ─── Agent prompts ────────────────────────────────────────────────────────────

const AGENTS = [
  {
    type: "quant",
    system: `You are Quant, a football statistics analyst for FootballTerror. You interpret ONLY the provided evidence. Never invent numbers. Respond ONLY with JSON: {"observations":[{"claim":"...","confidence":0.0-1.0}]}. Max 3 observations, each max 2 sentences.`,
    instruction: "Analyze the statistical profile: finishing quality vs xG, shot volume, what the numbers say about each team's performance.",
  },
  {
    type: "gaffer",
    system: `You are Gaffer, a tactical analyst for FootballTerror. Ground every claim in the evidence. Never invent tactical details. Respond ONLY with JSON: {"observations":[{"claim":"...","confidence":0.0-1.0}]}. Max 2 observations.`,
    instruction: "Hypothesize tactical patterns: pressing intensity, build-up approach, transition play — strictly from pressing and progression data.",
  },
  {
    type: "contrarian",
    system: `You are Contrarian for FootballTerror. Challenge obvious narratives. Find what the data says AGAINST the intuitive read. Respond ONLY with JSON: {"observations":[{"claim":"...","confidence":0.0-1.0}]}. Max 2 observations.`,
    instruction: "Challenge the natural narrative of this result. Look for evidence that contradicts the obvious story.",
  },
];

async function analyzeMatch(fixture: any): Promise<any | null> {
  const eventsPath = path.join(EVENTS_DIR, `${fixture.providerId ?? fixture.id.split(":").pop()}.json`);
  if (!fs.existsSync(eventsPath)) return null;

  const events: any[] = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
  const ev = extractEvidence(events, fixture);
  const evidenceText = Object.entries(ev).map(([k, v]) => `- ${k}: ${v}`).join("\n");

  const claims: any[] = [];

  // Specialist agents (small tier — cheap)
  for (const agent of AGENTS) {
    try {
      const raw = await llm([
        { role: "system", content: agent.system },
        { role: "user", content: `MATCH RESULT: ${ev.result}\n\nEVIDENCE:\n${evidenceText}\n\nTASK: ${agent.instruction}` },
      ], true);
      const parsed = parseJson(raw);
      for (const obs of (parsed?.observations ?? []).slice(0, 3)) {
        if (typeof obs.claim !== "string" || obs.claim.length < 10) continue;
        claims.push({
          agentType: agent.type,
          claimType: "INFERENCE",
          claim: String(obs.claim).slice(0, 400),
          confidence: typeof obs.confidence === "number" ? Math.min(1, Math.max(0, obs.confidence)) : 0.6,
        });
      }
    } catch (e) {
      console.log(`  [${agent.type}] failed: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // The Terror synthesis (heavier call)
  let verdict: any = null;
  if (claims.length > 0) {
    try {
      const raw = await llm([
        {
          role: "system",
          content: `You are The Terror, chief intelligence agent of FootballTerror. Synthesize agent claims into a verdict. NEVER invent facts. Respond ONLY with JSON: {"headline":"max 80 chars","summary":"2-3 sentences","keyInsights":["...","...","..."]}. Each insight must trace to an agent claim.`,
        },
        {
          role: "user",
          content: `FIXTURE: ${ev.result}\n\nAGENT CLAIMS:\n${claims.map((c) => `[${c.agentType}@${Math.round(c.confidence * 100)}%] ${c.claim}`).join("\n")}`,
        },
      ], true);
      const parsed = parseJson(raw);
      if (parsed?.headline && parsed?.summary) {
        verdict = {
          headline: String(parsed.headline).slice(0, 120),
          summary: String(parsed.summary).slice(0, 600),
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.map(String).slice(0, 5) : [],
        };
      }
    } catch (e) {
      console.log(`  [terror] failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { fixtureId: fixture.id, slug: fixture.slug, date: fixture.date, claims, verdict };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args.find((a) => a.startsWith("--limit"))?.split("=")[1] ?? "10", 10);
  const offset = parseInt(args.find((a) => a.startsWith("--offset"))?.split("=")[1] ?? "0", 10);

  const fixtures: any[] = fs.readFileSync(path.join(DB_DIR, "fixtures.jsonl"), "utf-8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));

  // Only matches with big narrative value first: score lines with 4+ goals or top clubs
  const interesting = fixtures
    .filter((f) => f.homeScore + f.awayScore >= 4 || ["Liverpool", "Arsenal", "Chelsea", "Manchester United", "Manchester City", "Tottenham Hotspur"].includes(f.homeTeamName) || ["Liverpool", "Arsenal", "Chelsea", "Manchester United", "Manchester City", "Tottenham Hotspur"].includes(f.awayTeamName))
    .sort((a, b) => b.homeScore + b.awayScore - (a.homeScore + a.awayScore));

  const outFile = path.join(DB_DIR, "agent-analysis.jsonl");
  const done = new Set<string>();
  if (fs.existsSync(outFile) && !FORCE) {
    for (const line of fs.readFileSync(outFile, "utf8").split("\n").filter(Boolean)) {
      try { done.add(String(JSON.parse(line).fixtureId)); } catch {}
    }
  }

  const queue = interesting.filter((f) => FORCE || !done.has(f.id)).slice(offset, offset + limit);
  console.log(`Queue: ${queue.length} matches (${done.size} already analyzed, ${interesting.length} eligible)\n`);

  let ok = 0, fail = 0;
  for (let i = 0; i < queue.length; i++) {
    const f = queue[i]!;
    process.stdout.write(`[${i + 1}/${queue.length}] ${f.slug} ... `);
    try {
      const result = await analyzeMatch(f);
      if (result && result.claims.length > 0) {
        fs.appendFileSync(outFile, JSON.stringify(result) + "\n");
        ok++;
        console.log(`✅ ${result.claims.length} claims${result.verdict ? " + verdict" : ""}`);
      } else {
        fail++;
        console.log("⚠️ no claims produced");
      }
    } catch (e) {
      fail++;
      console.log(`❌ ${e instanceof Error ? e.message : e}`);
    }
    if (i < queue.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone: ${ok} analyzed, ${fail} failed/skipped. Output: ${outFile}`);
}

main();
