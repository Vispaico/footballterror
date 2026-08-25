/**
 * Predict upcoming fixtures using the final fitted Dixon-Coles parameters.
 *
 * Reads:  data/db/dc-params.json (fitted on all history)
 *         data/db/current-season-fixtures.jsonl
 * Writes: data/db/predictions-upcoming.jsonl — one immutable snapshot per fixture
 *
 * Name mapping: StatsBomb historical names → football-charts current names
 * handled via alias table below.
 *
 * Run: node_modules/.bin/tsx scripts/predict-upcoming.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_DIR = path.join(ROOT, "data/db");

// ─── DC math (mirrors fit-dixon-coles) ────────────────────────────────────────

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

const MAX_GOALS = 8;

interface FittedParams {
  fittedAt?: string;
  matchesUsed?: number;
  homeAdvantage: number;
  rho: number;
  teams: Record<string, { attack: number; defence: number }>;
}

function predict(params: FittedParams, homeName: string, awayName: string) {
  const h = params.teams[homeName];
  const a = params.teams[awayName];

  // Unseen teams (e.g. promoted clubs not in 2003/04+2015/16 data): league average
  const fallback = { attack: 0, defence: 0 };
  const H = h ?? fallback;
  const A = a ?? fallback;

  const lambda = Math.max(0.05, Math.exp(H.attack + A.defence + params.homeAdvantage));
  const mu = Math.max(0.05, Math.exp(A.attack + H.defence));

  const grid: number[][] = [];
  let total = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    grid[x] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = poissonPmf(x, lambda) * poissonPmf(y, mu) * tau(x, y, lambda, mu, params.rho);
      grid[x]![y] = p;
      total += p;
    }
  }

  let home = 0, draw = 0, away = 0;
  const scores: { score: string; probability: number }[] = [];
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = grid[x]![y]! / total;
      if (x > y) home += p; else if (x === y) draw += p; else away += p;
      if (x <= 5 && y <= 5) scores.push({ score: `${x}-${y}`, probability: p });
    }
  }
  scores.sort((m, n) => n.probability - m.probability);

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    homeWin: r3(home),
    draw: r3(draw),
    awayWin: r3(away),
    expectedHomeGoals: Math.round(lambda * 100) / 100,
    expectedAwayGoals: Math.round(mu * 100) / 100,
    topScores: scores.slice(0, 5).map((s) => ({ score: s.score, probability: r3(s.probability) })),
  };
}

// ─── Name aliases: football-charts → StatsBomb canonical ─────────────────────

const ALIASES: Record<string, string> = {
  "Manchester Utd": "Manchester United",
  "Man Utd": "Manchester United",
  "Man City": "Manchester City",
  "Nottingham": "Nottingham Forest",
  "Nott'm Forest": "Nottingham Forest",
  "Spurs": "Tottenham Hotspur",
  "Tottenham": "Tottenham Hotspur",
  "Newcastle": "Newcastle United",
  "Wolves": "Wolverhampton Wanderers",
  "West Brom": "West Bromwich Albion",
  "Sheffield Utd": "Sheffield United",
  "Sheffield Wed": "Sheffield Wednesday",
  "Cardiff": "Cardiff City",
  "Stoke": "Stoke City",
  "Swansea": "Swansea City",
  "Hull": "Hull City",
  "Leeds": "Leeds United",
  "Leicester": "Leicester City",
  "Norwich": "Norwich City",
  "Crystal Palace": "Crystal Palace",
};

function canon(name: string): { name: string; known: boolean } {
  const mapped = ALIASES[name] ?? name;
  return { name: mapped, known: true }; // known-ness checked against fitted teams by caller
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const rawParams = JSON.parse(fs.readFileSync(path.join(DB_DIR, "dc-params.json"), "utf-8"));

  // Resolve provider-ID keys → canonical names via clubs.jsonl
  const clubs: any[] = fs.readFileSync(path.join(DB_DIR, "clubs.jsonl"), "utf-8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const nameById = new Map<string, string>();
  for (const c of clubs) nameById.set(c.id, c.name);

  const teams: Record<string, { attack: number; defence: number }> = {};
  for (const [id, p] of Object.entries(rawParams.teams)) {
    const name = nameById.get(id);
    if (name) teams[name] = p as { attack: number; defence: number };
  }

  const params: FittedParams = {
    fittedAt: rawParams.fittedAt,
    matchesUsed: rawParams.matchesUsed,
    homeAdvantage: Number(rawParams.homeAdvantage),
    rho: Number(rawParams.rho),
    teams,
  };
  console.log(`DC params fitted ${params.fittedAt} on ${rawParams.matchesUsed} matches`);
  console.log(`Home advantage: ${params.homeAdvantage}, rho: ${params.rho}, teams resolved: ${Object.keys(teams).length}/${Object.keys(rawParams.teams).length}\n`);

  const fixtures: any[] = fs.readFileSync(path.join(DB_DIR, "current-season-fixtures.jsonl"), "utf-8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));

  // Sort by date
  fixtures.sort((a, b) => String(a.raw?.match_date ?? "").localeCompare(String(b.raw?.match_date ?? "")));

  const outFile = path.join(DB_DIR, "predictions-upcoming.jsonl");
  fs.writeFileSync(outFile, ""); // fresh generation each run (upcoming = replaceable)

  let count = 0;
  for (const fx of fixtures) {
    const raw = fx.raw ?? {};
    const homeRaw = raw.home_team ?? "";
    const awayRaw = raw.away_team ?? "";
    const home = canon(homeRaw);
    const away = canon(awayRaw);

    const homeKnown = !!params.teams[home.name];
    const awayKnown = !!params.teams[away.name];

    const p = predict(params, home.name, away.name);

    const slugTail = String(raw.slug ?? "").split("/").pop() ?? `${homeRaw}-vs-${awayRaw}`;
    const record = {
      id: `ft:footballcharts:${fx.providerId}:dc-v0`,
      providerId: fx.providerId,
      slug: `current-${slugTail}`,
      season: fx.season,
      matchDate: raw.match_date ?? raw.date ?? null,
      kickoff: raw.time ?? null,
      homeTeamName: homeRaw,
      awayTeamName: awayRaw,
      modelVersion: "dixon-coles-v0",
      generatedAt: new Date().toISOString(),
      informationCutoff: new Date().toISOString().slice(0, 10),
      ...p,
      confidence: Math.round((1 - [p.homeWin, p.draw, p.awayWin].reduce((acc, x) => acc + (x > 0 ? -x * Math.log2(x) : 0), 0) / Math.log2(3)) * 100) / 100,
      dataNotes: [
        ...(homeKnown ? [] : [`${homeRaw}: no history in fitted data — league-average parameters`]),
        ...(awayKnown ? [] : [`${awayRaw}: no history in fitted data — league-average parameters`]),
      ],
    };

    fs.appendFileSync(outFile, JSON.stringify(record) + "\n");
    count++;

    const note = (!homeKnown || !awayKnown) ? " ⚠️ partial data" : "";
    console.log(`${String(raw.match_date ?? "")}  ${homeRaw} vs ${awayRaw}  → ${(p.homeWin * 100).toFixed(0)}% / ${(p.draw * 100).toFixed(0)}% / ${(p.awayWin * 100).toFixed(0)}%  xG ${p.expectedHomeGoals}-${p.expectedAwayGoals}${note}`);
  }

  console.log(`\n${count} upcoming predictions written to predictions-upcoming.jsonl`);
}

main();
