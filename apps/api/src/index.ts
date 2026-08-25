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
    res.json({
      verdict: match.verdict ?? null,
      claims: match.allClaims ?? [],
      runs: match.agentRuns ?? [],
      note: match.verdict ? undefined : "Agent analysis not yet generated for this match",
    });
  } catch {
    res.status(500).json({ error: "Failed to load agents" });
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
