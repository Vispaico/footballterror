import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "../../data");
const MATCH_OUTPUT_DIR = path.join(DATA_DIR, "match-output");

// ─── Root: API index ──────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "FootballTerror API",
    version: "0.1.0",
    docs: {
      health: "GET /health",
      fixtures: "GET /api/fixtures",
      match: "GET /api/match/:slug",
      prediction: "GET /api/match/:slug/prediction",
      agents: "GET /api/match/:slug/agents",
      features: "GET /api/match/:slug/features",
      powerIndex: "GET /api/power-index",
      terrorIndex: "GET /api/terror-index",
      ingest: "POST /api/ingest",
    },
    example: "/api/match/liverpool-arsenal-2016-01-13",
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "footballterror-api", version: "0.1.0", uptime: process.uptime() });
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
app.get("/api/fixtures", async (_req, res) => {
  try {
    const files = await fs.readdir(MATCH_OUTPUT_DIR).catch(() => []);
    const fixtures = [];
    for (const file of files.filter(f => f.endsWith(".json"))) {
      const data = JSON.parse(await fs.readFile(path.join(MATCH_OUTPUT_DIR, file), "utf-8"));
      fixtures.push({
        slug: data.fixture.slug,
        homeTeam: data.fixture.homeTeamName,
        awayTeam: data.fixture.awayTeamName,
        homeScore: data.fixture.homeScore,
        awayScore: data.fixture.awayScore,
        date: data.fixture.date,
        competition: data.fixture.competition,
        status: data.fixture.status,
      });
    }
    res.json({ fixtures, total: fixtures.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to load fixtures" });
  }
});

// ─── Single Match ─────────────────────────────────────────────────────────────
app.get("/api/match/:slug", async (req, res) => {
  try {
    const filePath = path.join(MATCH_OUTPUT_DIR, `${req.params.slug}.json`);
    const data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    res.json(data);
  } catch {
    res.status(404).json({ error: "Match not found" });
  }
});

// ─── Match Prediction ─────────────────────────────────────────────────────────
app.get("/api/match/:slug/prediction", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(path.join(MATCH_OUTPUT_DIR, `${req.params.slug}.json`), "utf-8"));
    res.json({
      prediction: data.prediction,
      elo: data.elo,
      powerIndex: { home: 58.9, away: 65.8 }, // TODO: compute from features
      terrorIndex: { score: 41.3, level: "WATCHABLE" }, // TODO: compute
    });
  } catch {
    res.status(404).json({ error: "Match not found" });
  }
});

// ─── Match Agents ─────────────────────────────────────────────────────────────
app.get("/api/match/:slug/agents", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(path.join(MATCH_OUTPUT_DIR, `${req.params.slug}.json`), "utf-8"));
    res.json({
      verdict: data.verdict,
      claims: data.allClaims,
      runs: data.agentRuns?.map((r: any) => ({
        agentType: r.agentType,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    });
  } catch {
    res.status(404).json({ error: "Match not found" });
  }
});

// ─── Match Features ───────────────────────────────────────────────────────────
app.get("/api/match/:slug/features", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(path.join(MATCH_OUTPUT_DIR, `${req.params.slug}.json`), "utf-8"));
    res.json({
      home: data.homeFeatures,
      away: data.awayFeatures,
    });
  } catch {
    res.status(404).json({ error: "Match not found" });
  }
});

// ─── Power Index ──────────────────────────────────────────────────────────────
app.get("/api/power-index", async (_req, res) => {
  // TODO: compute from database
  res.json({ teams: [], computedAt: new Date().toISOString() });
});

// ─── Terror Index ─────────────────────────────────────────────────────────────
app.get("/api/terror-index", async (_req, res) => {
  // TODO: compute from database
  res.json({ matches: [], computedAt: new Date().toISOString() });
});

// ─── Ingestion Trigger ────────────────────────────────────────────────────────
app.post("/api/ingest", async (req, res) => {
  // TODO: trigger ingestion pipeline
  res.json({ status: "not_implemented", message: "Ingestion pipeline not yet wired to API" });
});

app.listen(PORT, () => {
  console.log(`FootballTerror API running on port ${PORT}`);
  console.log(`Data directory: ${MATCH_OUTPUT_DIR}`);
});
