import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Data roots: bulk JSONL store + legacy match-output dir
const DATA_DIR = process.env.DATA_DIR
  ? (path.isAbsolute(process.env.DATA_DIR) ? process.env.DATA_DIR : path.resolve(process.cwd(), process.env.DATA_DIR))
  : [path.resolve(process.cwd(), "../../data"), path.resolve(process.cwd(), "../data"), path.resolve("/app/data")]
      .find((p) => existsSync(p)) ?? path.resolve(process.cwd(), "../../data");
const DB_DIR = path.join(DATA_DIR, "db");
const MATCH_OUTPUT_DIR = existsSync(path.join(DB_DIR, "match-output"))
  ? path.join(DB_DIR, "match-output")
  : path.join(DATA_DIR, "match-output");

// ─── Cached bulk store ────────────────────────────────────────────────────────
interface StoreEntry { [k: string]: unknown }
let fixturesCache: StoreEntry[] | null = null;
let ratingsCache: StoreEntry[] | null = null;
let dcPredsCache: Map<string, StoreEntry> | null = null;
let agentAnalysisCache: Map<string, StoreEntry> | null = null;
let ratingsByFixtureCache: Map<string, { home: StoreEntry; away: StoreEntry }> | null = null;

async function loadRatingsByFixture(): Promise<Map<string, { home: StoreEntry; away: StoreEntry }>> {
  if (ratingsByFixtureCache) return ratingsByFixtureCache;
  ratingsByFixtureCache = new Map();
  try {
    const raw = await fs.readFile(path.join(DB_DIR, "ratings.jsonl"), "utf-8");
    for (const line of raw.split("\n").filter(Boolean)) {
      const r = JSON.parse(line);
      if (!r.fixtureId) continue;
      let entry = ratingsByFixtureCache.get(String(r.fixtureId));
      if (!entry) { entry = {} as any; ratingsByFixtureCache.set(String(r.fixtureId), entry); }
      // First row per fixture is home (ingest order), second is away
      if (!(entry as any).home) (entry as any).home = r;
      else (entry as any).away = r;
    }
  } catch {}
  return ratingsByFixtureCache!;
}

/** Pre-match Elo for one fixture (from chronological replay) */
async function fixtureElo(fixtureId?: string) {
  if (!fixtureId) return null;
  const pair = (await loadRatingsByFixture()).get(fixtureId);
  if (!pair?.home || !pair?.away) return null;
  const hr = Number((pair.home as any).preRating);
  const ar = Number((pair.away as any).preRating);
  const expHome = 1 / (1 + Math.pow(10, (ar - hr - 100) / 400));
  return {
    homeRating: hr,
    awayRating: ar,
    homeExpected: Math.round(expHome * 1000) / 1000,
    awayExpected: Math.round((1 - expHome) * 1000) / 1000,
    homeDelta: (pair.home as any).delta,
    awayDelta: (pair.away as any).delta,
  };
}

async function loadAgentAnalysis(): Promise<Map<string, StoreEntry>> {
  if (agentAnalysisCache) return agentAnalysisCache;
  agentAnalysisCache = new Map();
  try {
    const raw = await fs.readFile(path.join(DB_DIR, "agent-analysis.jsonl"), "utf-8");
    for (const line of raw.split("\n").filter(Boolean)) {
      const a = JSON.parse(line);
      if (a.fixtureId) agentAnalysisCache.set(String(a.fixtureId), a);
    }
  } catch {}
  return agentAnalysisCache!;
}

async function loadDcPreds(): Promise<Map<string, StoreEntry>> {
  if (dcPredsCache) return dcPredsCache;
  dcPredsCache = new Map();
  try {
    const raw = await fs.readFile(path.join(DB_DIR, "predictions-dc.jsonl"), "utf-8");
    for (const line of raw.split("\n").filter(Boolean)) {
      const p = JSON.parse(line);
      dcPredsCache.set(String(p.fixtureId), p);
    }
  } catch {}
  return dcPredsCache!;
}

async function loadFixtures(): Promise<StoreEntry[]> {
  if (fixturesCache) return fixturesCache;
  try {
    const raw = await fs.readFile(path.join(DB_DIR, "fixtures.jsonl"), "utf-8");
    fixturesCache = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    fixturesCache = [];
  }
  return fixturesCache!;
}

async function loadRatings(): Promise<StoreEntry[]> {
  if (ratingsCache) return ratingsCache;
  try {
    const raw = await fs.readFile(path.join(DB_DIR, "final-ratings.json"), "utf-8");
    ratingsCache = JSON.parse(raw);
  } catch {
    ratingsCache = [];
  }
  return ratingsCache!;
}

// ─── Root: API index ──────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "FootballTerror API",
    version: "0.2.0",
    docs: {
      health: "GET /health",
      fixtures: "GET /api/fixtures?season=&team=",
      match: "GET /api/match/:slug",
      prediction: "GET /api/match/:slug/prediction",
      agents: "GET /api/match/:slug/agents",
      features: "GET /api/match/:slug/features",
      powerIndex: "GET /api/power-index",
    },
    example: "/api/match/liverpool-vs-arsenal-2016-01-13",
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "footballterror-api", version: "0.2.0", uptime: Math.round(process.uptime()) });
});

// ─── Fixtures (bulk, filterable) ─────────────────────────────────────────────
app.get("/api/fixtures", async (req, res) => {
  const all = await loadFixtures();
  let items = all;
  const { season, team, limit } = req.query as { season?: string; team?: string; limit?: string };

  if (season) items = items.filter((f) => f.season === season);
  if (team) {
    const t = String(team).toLowerCase();
    items = items.filter(
      (f) => String(f.homeTeamName).toLowerCase().includes(t) || String(f.awayTeamName).toLowerCase().includes(t)
    );
  }

  // Newest first for browsing
  items = [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const lim = limit ? Math.min(parseInt(String(limit), 10) || 50, 500) : undefined;
  res.json({
    total: items.length,
    fixtures: lim ? items.slice(0, lim) : items,
    seasons: [...new Set(all.map((f) => f.season))].sort(),
  });
});

// ─── Single Match (bulk payload first, legacy fallback) ──────────────────────
async function readMatch(slug: string): Promise<any | null> {
  const bulkPath = path.join(MATCH_OUTPUT_DIR, `${slug}.json`);
  if (existsSync(bulkPath)) {
    return JSON.parse(await fs.readFile(bulkPath, "utf-8"));
  }
  const legacyPath = path.join(DATA_DIR, "match-output", `${slug}.json`);
  if (existsSync(legacyPath)) {
    return JSON.parse(await fs.readFile(legacyPath, "utf-8"));
  }
  return null;
}

app.get("/api/match/:slug", async (req, res) => {
  try {
    const match = await readMatch(req.params.slug);
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (!match.elo && match.fixture?.id) {
      match.elo = await fixtureElo(match.fixture.id);
    }
    res.json(match);
  } catch {
    res.status(500).json({ error: "Failed to load match" });
  }
});

app.get("/api/match/:slug/prediction", async (req, res) => {
  try {
    const slug = req.params.slug;
    const match = await readMatch(slug);
    const fixtureId = match?.fixture?.id;

    // Prefer Dixon-Coles snapshot; fall back to elo-v0
    const dcMap = await loadDcPreds();
    let pred: any = fixtureId ? dcMap.get(fixtureId) : undefined;
    if (!pred && fixtureId) {
      // legacy elo store
      const predsRaw = await fs.readFile(path.join(DB_DIR, "predictions.jsonl"), "utf-8").catch(() => "");
      const preds = predsRaw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
      pred = preds.find((p: any) => p.fixtureId === fixtureId);
      if (!pred) return res.status(404).json({ error: "Prediction not found" });
      return res.json({
        prediction: {
          homeWin: pred.homeWinProbability,
          draw: pred.drawProbability,
          awayWin: pred.awayWinProbability,
          confidence: pred.confidence,
          modelVersion: pred.modelVersion,
          informationCutoff: pred.informationCutoff,
        },
        actual: { homeGoals: pred.actualHomeGoals, awayGoals: pred.actualAwayGoals },
      });
    }
    if (!pred) return res.status(404).json({ error: "Prediction not found" });

    res.json({
      prediction: {
        homeWin: pred.homeWinProbability,
        draw: pred.drawProbability,
        awayWin: pred.awayWinProbability,
        expectedHomeGoals: pred.expectedHomeGoals,
        expectedAwayGoals: pred.expectedAwayGoals,
        topScores: pred.topScores,
        confidence: pred.confidence,
        modelVersion: pred.modelVersion,
        informationCutoff: pred.informationCutoff,
      },
      actual: { homeGoals: pred.actualHomeGoals, awayGoals: pred.actualAwayGoals },
    });
  } catch {
    res.status(500).json({ error: "Failed to load prediction" });
  }
});

// ─── Model performance (public transparency, spec §21) ────────────────────────
app.get("/api/models/performance", async (_req, res) => {
  try {
    const evaluation = JSON.parse(await fs.readFile(path.join(DB_DIR, "model-eval.json"), "utf-8"));
    res.json(evaluation);
  } catch {
    res.status(404).json({ error: "No evaluation available yet" });
  }
});

app.get("/api/match/:slug/features", async (req, res) => {
  try {
    const match = await readMatch(req.params.slug);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json({ home: match.homeFeatures, away: match.awayFeatures });
  } catch {
    res.status(500).json({ error: "Failed to load features" });
  }
});

app.get("/api/match/:slug/agents", async (req, res) => {
  try {
    const match = await readMatch(req.params.slug);
    if (!match) return res.status(404).json({ error: "Match not found" });
    const fixtureId = match.fixture?.id;

    // Prefer LLM-generated analysis
    const analysis = await loadAgentAnalysis();
    const llm = fixtureId ? analysis.get(fixtureId) : undefined;
    if (llm) {
      return res.json({
        verdict: llm.verdict ?? null,
        claims: llm.claims ?? [],
        source: "minimax-m3",
      });
    }

    // Deterministic fallback (the original demo match)
    res.json({
      verdict: match.verdict ?? null,
      claims: match.allClaims ?? [],
      runs: match.agentRuns ?? [],
      source: match.allClaims ? "deterministic-v0" : null,
      note: match.allClaims ? undefined : "No agent analysis available for this match",
    });
  } catch {
    res.status(500).json({ error: "Failed to load agents" });
  }
});

// ─── Intelligence feed: latest Terror verdicts ────────────────────────────────
app.get("/api/intelligence", async (_req, res) => {
  try {
    const analysis = await loadAgentAnalysis();
    const all = await loadFixtures();
    const byId = new Map(all.map((f: any) => [f.id, f]));
    const verdicts = [...analysis.values()]
      .filter((a: any) => a.verdict)
      .map((a: any) => ({
        fixtureId: a.fixtureId,
        slug: a.slug,
        date: a.date,
        headline: a.verdict.headline,
        summary: a.verdict.summary,
        keyInsights: a.verdict.keyInsights,
        claimCount: (a.claims ?? []).length,
        fixture: byId.get(a.fixtureId) ? {
          homeTeamName: byId.get(a.fixtureId)!.homeTeamName,
          awayTeamName: byId.get(a.fixtureId)!.awayTeamName,
          homeScore: byId.get(a.fixtureId)!.homeScore,
          awayScore: byId.get(a.fixtureId)!.awayScore,
          season: byId.get(a.fixtureId)!.season,
        } : null,
      }))
      .sort((x, y) => String(y.date).localeCompare(String(x.date)));
    res.json({ total: verdicts.length, verdicts });
  } catch {
    res.status(500).json({ error: "Failed to load intelligence" });
  }
});

// ─── Power Index (from real Elo history) ─────────────────────────────────────
app.get("/api/power-index", async (_req, res) => {
  const ratings = await loadRatings();
  res.json({
    model: "elo-replay-v0",
    computedAt: new Date().toISOString(),
    teams: ratings.map((r: any) => ({ teamId: r.teamId, name: r.name, score: r.rating })),
  });
});

app.listen(PORT, () => {
  console.log(`FootballTerror API running on port ${PORT}`);
  console.log(`DB dir: ${DB_DIR}`);
  console.log(`Match output: ${MATCH_OUTPUT_DIR}`);
});
