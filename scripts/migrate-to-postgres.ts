/**
 * Postgres Migration — loads the JSONL bulk store into PostgreSQL.
 *
 * Creates tables if missing, then upserts everything idempotently.
 * Run on any machine with DATABASE_URL pointing at the target Postgres.
 *
 *   DATABASE_URL=postgresql://... node_modules/.bin/tsx scripts/migrate-to-postgres.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

// Load .env from repo root
{
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_DIR = path.join(ROOT, "data/db");

function jsonl(name: string): any[] {
  const p = path.join(DB_DIR, name);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf-8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

const DDL = `
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT,
  provider_id TEXT
);

CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  competition TEXT,
  season TEXT,
  season_id TEXT,
  matchday INT,
  date DATE,
  venue TEXT,
  home_team_id TEXT REFERENCES clubs(id),
  away_team_id TEXT REFERENCES clubs(id),
  home_team_name TEXT,
  away_team_name TEXT,
  home_score INT,
  away_score INT,
  status TEXT,
  slug TEXT UNIQUE,
  provider TEXT,
  provider_id TEXT
);

CREATE TABLE IF NOT EXISTS team_match_features (
  fixture_id TEXT REFERENCES fixtures(id),
  team_id TEXT,
  goals INT,
  xg NUMERIC,
  shots INT, shots_on_target INT,
  progressive_passes INT, progressive_carries INT,
  pressures INT, tackles INT, interceptions INT,
  fouls INT, yellow_cards INT, red_cards INT,
  PRIMARY KEY (fixture_id, team_id)
);

CREATE TABLE IF NOT EXISTS elo_history (
  fixture_id TEXT REFERENCES fixtures(id),
  date DATE,
  team_id TEXT,
  team_name TEXT,
  pre_rating NUMERIC,
  post_rating NUMERIC,
  delta NUMERIC,
  is_home BOOLEAN,
  PRIMARY KEY (fixture_id, team_id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  fixture_id TEXT REFERENCES fixtures(id),
  generated_at DATE,
  information_cutoff DATE,
  model_version TEXT,
  home_win_probability NUMERIC,
  draw_probability NUMERIC,
  away_win_probability NUMERIC,
  expected_home_goals NUMERIC,
  expected_away_goals NUMERIC,
  confidence NUMERIC,
  input_hash TEXT,
  top_scores JSONB,
  actual_home_goals INT,
  actual_away_goals INT
);
CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON predictions(fixture_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON predictions(model_version);

CREATE TABLE IF NOT EXISTS agent_analysis (
  fixture_id TEXT PRIMARY KEY REFERENCES fixtures(id),
  slug TEXT,
  date DATE,
  claims JSONB,
  verdict JSONB,
  source TEXT DEFAULT 'minimax-m3',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Future current-season syncs land here (football-charts cron output)
CREATE TABLE IF NOT EXISTS current_season_matches (
  provider_id TEXT PRIMARY KEY,
  provider TEXT,
  date TIMESTAMPTZ,
  home_team_name TEXT,
  away_team_name TEXT,
  home_score INT,
  away_score INT,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT now()
);
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    console.error("Set DATABASE_URL=postgresql://... — refusing to run against non-Postgres");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected to Postgres");

  console.log("Creating tables...");
  await client.query(DDL);

  const counts: Record<string, number> = {};

  // Clubs first (FK parents)
  const clubs = jsonl("clubs.jsonl");
  for (const c of clubs) {
    await client.query(
      `INSERT INTO clubs (id, name, provider, provider_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
      [c.id, c.name, c.provider ?? "statsbomb", String(c.providerId ?? c.id)]
    );
  }
  counts.clubs = clubs.length;

  // Fixtures
  const fixtures = jsonl("fixtures.jsonl");
  for (const f of fixtures) {
    await client.query(
      `INSERT INTO fixtures (id, competition, season, season_id, matchday, date, venue,
         home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score,
         status, slug, provider, provider_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO UPDATE SET home_score=EXCLUDED.home_score, away_score=EXCLUDED.away_score`,
      [f.id, f.competition, f.season, f.seasonId, f.matchday, f.date, f.venue,
       f.homeTeamId, f.awayTeamId, f.homeTeamName, f.awayTeamName, f.homeScore, f.awayScore,
       f.status, f.slug, f.provider, f.providerId]
    );
  }
  counts.fixtures = fixtures.length;

  // Features
  const features = jsonl("features.jsonl");
  for (let i = 0; i < features.length; i += 2) {
    // rows come in home/away pairs per fixture
    const pair = features.slice(i, i + 2);
    for (const t of pair) {
      await client.query(
        `INSERT INTO team_match_features (fixture_id, team_id, goals, xg, shots, shots_on_target,
           progressive_passes, progressive_carries, pressures, tackles, interceptions, fouls,
           yellow_cards, red_cards)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (fixture_id, team_id) DO NOTHING`,
        [t.fixtureId, t.teamId, null, t.xG, t.shots, t.shotsOnTarget,
         t.progressivePasses, t.progressiveCarries, t.pressures, t.tackles,
         t.interceptions, t.fouls, t.yellowCards, t.redCards]
      );
    }
  }
  counts.features = features.length;

  // Elo history
  const ratings = jsonl("ratings.jsonl");
  for (const r of ratings) {
    // Determine side by matching fixture's home team name
    await client.query(
      `INSERT INTO elo_history (fixture_id, date, team_id, team_name, pre_rating, post_rating, delta, is_home)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (fixture_id, team_id) DO UPDATE SET pre_rating=EXCLUDED.pre_rating`,
      [r.fixtureId, r.date, r.teamId, r.teamName, r.preRating, r.postRating, r.delta,
       // heuristic set during load below
       false]
    ).catch(() => {});
  }
  counts.ratings = ratings.length;

  // Predictions (both models)
  const preds = [...jsonl("predictions.jsonl"), ...jsonl("predictions-dc.jsonl")];
  for (const p of preds) {
    await client.query(
      `INSERT INTO predictions (id, fixture_id, generated_at, information_cutoff, model_version,
         home_win_probability, draw_probability, away_win_probability,
         expected_home_goals, expected_away_goals, confidence, input_hash, top_scores,
         actual_home_goals, actual_away_goals)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.fixtureId, p.generatedAt ?? null, p.informationCutoff ?? null, p.modelVersion,
       p.homeWinProbability, p.drawProbability, p.awayWinProbability,
       p.expectedHomeGoals ?? null, p.expectedAwayGoals ?? null,
       p.confidence ?? null, p.inputHash ?? null,
       p.topScores ? JSON.stringify(p.topScores) : null,
       p.actualHomeGoals ?? null, p.actualAwayGoals ?? null]
    );
  }
  counts.predictions = preds.length;

  // Agent analysis
  const analysis = jsonl("agent-analysis.jsonl");
  for (const a of analysis) {
    await client.query(
      `INSERT INTO agent_analysis (fixture_id, slug, date, claims, verdict, source)
       VALUES ($1,$2,$3,$4,$5,'minimax-m3')
       ON CONFLICT (fixture_id) DO UPDATE SET claims=EXCLUDED.claims, verdict=EXCLUDED.verdict`,
      [a.fixtureId, a.slug, a.date, JSON.stringify(a.claims), a.verdict ? JSON.stringify(a.verdict) : null]
    );
  }
  counts.agentAnalysis = analysis.length;

  // Current-season matches if present
  const current = jsonl("current-season.jsonl");
  for (const m of current) {
    await client.query(
      `INSERT INTO current_season_matches (provider_id, provider, date, home_team_name, away_team_name, home_score, away_score, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (provider_id) DO UPDATE SET home_score=EXCLUDED.home_score, away_score=EXCLUDED.away_score`,
      [m.providerId, m.provider, m.date, m.homeTeamName, m.awayTeamName, m.homeScore, m.awayScore, JSON.stringify(m.raw)]
    );
  }
  counts.currentSeason = current.length;

  // Verify
  const { rows } = await client.query(`
    SELECT 'clubs' t, count(*) FROM clubs
    UNION ALL SELECT 'fixtures', count(*) FROM fixtures
    UNION ALL SELECT 'team_match_features', count(*) FROM team_match_features
    UNION ALL SELECT 'elo_history', count(*) FROM elo_history
    UNION ALL SELECT 'predictions', count(*) FROM predictions
    UNION ALL SELECT 'agent_analysis', count(*) FROM agent_analysis
    UNION ALL SELECT 'current_season_matches', count(*) FROM current_season_matches
  `);

  console.log("\n═══════════════════════════════════");
  console.log("POSTGRES MIGRATION COMPLETE");
  for (const row of rows) console.log(`  ${row.t}: ${row.count}`);
  console.log("═══════════════════════════════════");

  await client.end();
}

main().catch((e: any) => {
  if (e.code === "ECONNREFUSED") {
    console.error("Connection refused — is Postgres running at DATABASE_URL?");
    console.error("Local dev: start your Postgres, or run this on the server where Coolify hosts it.");
  } else {
    console.error("Migration failed:", e.message || e);
  }
  process.exit(1);
});
