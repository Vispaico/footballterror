/**
 * Dixon-Coles Model Fitting + Backtest
 *
 * Fits attack/defence parameters per team from historical match results using
 * maximum-likelihood estimation with the Dixon-Coles low-score correlation
 * adjustment. Then replays history chronologically: for each match, the model
 * is fitted ONLY on matches before it (true out-of-sample backtest).
 *
 * Outputs:
 *   data/db/dc-params.json        — final fitted parameters (all history)
 *   data/db/predictions-dc.jsonl  — one immutable prediction snapshot per match
 *   data/db/model-eval.json       — honest comparison vs elo-v0 baseline
 *
 * Run: node_modules/.bin/tsx scripts/fit-dixon-coles.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_DIR = path.join(ROOT, "data/db");

// ─── Model math ───────────────────────────────────────────────────────────────

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Dixon-Coles tau correction for 0-0, 1-0, 0-1, 1-1 */
function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

interface Params {
  attack: Map<string, number>;
  defence: Map<string, number>;
  homeAdv: number;
  rho: number;
}

const MAX_GOALS = 8;

function scoreMatrix(p: Params, homeId: string, awayId: string): number[][] {
  const lambda = Math.max(0.05, Math.exp(p.attack.get(homeId)! + p.defence.get(awayId)! + p.homeAdv));
  const mu = Math.max(0.05, Math.exp(p.attack.get(awayId)! + p.defence.get(homeId)!));
  const grid: number[][] = [];
  let total = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    grid[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const prob = poissonPmf(h, lambda) * poissonPmf(a, mu) * tau(h, a, lambda, mu, p.rho);
      grid[h][a] = prob;
      total += prob;
    }
  }
  // normalize (tau can push mass slightly off)
  for (let h = 0; h <= MAX_GOALS; h++) for (let a = 0; a <= MAX_GOALS; a++) grid[h][a] /= total;
  return grid;
}

function outcomeProbs(grid: number[][]): { home: number; draw: number; away: number; expH: number; expA: number } {
  let home = 0, draw = 0, away = 0, expH = 0, expA = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h]!.length; a++) {
      const p = grid[h]![a]!;
      if (h > a) home += p; else if (h === a) draw += p; else away += p;
      expH += h * p;
      expA += a * p;
    }
  }
  return { home, draw, away, expH, expA };
}

// ─── Fitting (gradient-free iterative MLE) ────────────────────────────────────

interface MatchRow { date: string; homeId: string; awayId: string; hg: number; ag: number }

/**
 * Fit DC params via simple coordinate-descent on the log-likelihood.
 * Not fancy, but deterministic and robust — good enough for v0.
 */
function fitParams(matches: MatchRow[], teams: string[], iterations = 60): Params {
  const n = teams.length;
  const attack = new Map<string, number>();
  const defence = new Map<string, number>();
  for (const t of teams) { attack.set(t, 0); defence.set(t, 0); }
  const params: Params = { attack, defence, homeAdv: 0.25, rho: -0.1 };

  // Constrain: mean(attack)=0 via normalization each pass
  const step = 0.02;

  function logLik(): number {
    let ll = 0;
    for (const m of matches) {
      const lambda = Math.max(0.05, Math.exp(params.attack.get(m.homeId)! + params.defence.get(m.awayId)! + params.homeAdv));
      const mu = Math.max(0.05, Math.exp(params.attack.get(m.awayId)! + params.defence.get(m.homeId)!));
      ll += Math.log(Math.max(1e-10, poissonPmf(m.hg, lambda) * poissonPmf(m.ag, mu) * tau(m.hg, m.ag, lambda, mu, params.rho)));
    }
    return ll;
  }

  let current = logLik();
  for (let iter = 0; iter < iterations; iter++) {
    let improved = false;

    for (const t of teams) {
      // Try adjusting attack up/down
      for (const dir of [step, -step]) {
        const old = params.attack.get(t)!;
        params.attack.set(t, old + dir);
        const ll = logLik();
        if (ll > current + 1e-9) { current = ll; improved = true; }
        else params.attack.set(t, old);

        // Defence
        const oldD = params.defence.get(t)!;
        params.defence.set(t, oldD + dir);
        const ll2 = logLik();
        if (ll2 > current + 1e-9) { current = ll2; improved = true; }
        else params.defence.set(t, oldD);
      }
    }

    // Home advantage
    {
      const old = params.homeAdv;
      params.homeAdv = old + step;
      let ll = logLik();
      if (ll > current + 1e-9) { current = ll; improved = true; }
      else { params.homeAdv = old - step; ll = logLik(); if (ll > current + 1e-9) { current = ll; improved = true; } else params.homeAdv = old; }
    }

    // Rho (clamped to valid range)
    {
      const old = params.rho;
      for (const cand of [old + 0.02, old - 0.02]) {
        if (cand < -0.25 || cand > 0.15) continue;
        params.rho = cand;
        const ll = logLik();
        if (ll > current + 1e-9) { current = ll; improved = true; break; }
        else params.rho = old;
      }
    }

    // Normalize attack to mean zero (identifiability)
    {
      let mean = 0;
      for (const t of teams) mean += params.attack.get(t)!;
      mean /= n;
      for (const t of teams) params.attack.set(t, params.attack.get(t)! - mean);
    }

    if (!improved) break;
  }

  return params;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Dixon-Coles fitting + chronological backtest");
  console.log("═══════════════════════════════════════════════\n");

  // Load fixtures
  const fixtures: any[] = fs.readFileSync(path.join(DB_DIR, "fixtures.jsonl"), "utf-8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const WARMUP = 60; // matches before first prediction

  const allTeams = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
  console.log(`Fixtures: ${fixtures.length}, teams: ${allTeams.length}, warmup: ${WARMUP}\n`);

  const rows: MatchRow[] = fixtures.map((f) => ({
    date: f.date,
    homeId: f.homeTeamId,
    awayId: f.awayTeamId,
    hg: f.homeScore,
    ag: f.awayScore,
  }));

  const predictions: unknown[] = [];
  const evalRows: { actual: "H" | "D" | "A"; dc: { H: number; D: number; A: number }; elo: { H: number; D: number; A: number }; ehg: number; eag: number }[] = [];

  // Load elo-v0 predictions for comparison
  const eloPreds = new Map<string, any>();
  for (const line of fs.readFileSync(path.join(DB_DIR, "predictions.jsonl"), "utf-8").split("\n").filter(Boolean)) {
    const p = JSON.parse(line);
    eloPreds.set(p.fixtureId, p);
  }

  // Chronological out-of-sample backtest with refit every N matches
  const REFIT_EVERY = 20;
  let params: Params | null = null;

  for (let i = WARMUP; i < rows.length; i++) {
    const target = rows[i]!;
    const history = rows.slice(0, i);
    const teamsSoFar = [...new Set(history.flatMap((m) => [m.homeId, m.awayId]))];

    if (!params || i % REFIT_EVERY === 0) {
      params = fitParams(history, teamsSoFar);
      process.stdout.write(`\r  refit at match ${i}/${rows.length}   `);
    }

    // Ensure unseen teams have baseline params
    for (const t of [target.homeId, target.awayId]) {
      if (!params.attack.has(t)) { params.attack.set(t, 0); params.defence.set(t, 0); }
    }

    const grid = scoreMatrix(params, target.homeId, target.awayId);
    const probs = outcomeProbs(grid);

    // Top score lines
    const scores: { h: number; a: number; p: number }[] = [];
    for (let h = 0; h <= 5; h++) for (let a = 0; a <= 5; a++) scores.push({ h, a, p: grid[h]![a]! });
    scores.sort((x, y) => y.p - x.p);

    const fixtureId = `ft:statsbomb:${fixtures[i]!.id.split(":").pop()}`;
    const pred = {
      id: `${fixtureId}:dc-v0`,
      fixtureId,
      generatedAt: target.date,
      informationCutoff: target.date,
      modelVersion: "dixon-coles-v0",
      homeWinProbability: round3(probs.home),
      drawProbability: round3(probs.draw),
      awayWinProbability: round3(probs.away),
      expectedHomeGoals: Math.round(probs.expH * 100) / 100,
      expectedAwayGoals: Math.round(probs.expA * 100) / 100,
      topScores: scores.slice(0, 5).map((s) => ({ score: `${s.h}-${s.a}`, probability: round3(s.p) })),
      confidence: round3(1 - entropy([probs.home, probs.draw, probs.away]) / Math.log2(3)),
      inputHash: `history=${i};refit=${REFIT_EVERY}`,
      actualHomeGoals: target.hg,
      actualAwayGoals: target.ag,
    };
    predictions.push(pred);

    const actual: "H" | "D" | "A" = target.hg > target.ag ? "H" : target.hg === target.ag ? "D" : "A";
    const ep = eloPreds.get(fixtureId);
    evalRows.push({
      actual,
      dc: { H: probs.home, D: probs.draw, A: probs.away },
      elo: ep ? { H: ep.homeWinProbability, D: ep.drawProbability, A: ep.awayWinProbability } : { H: 1 / 3, D: 1 / 3, A: 1 / 3 },
      ehg: probs.expH,
      eag: probs.expA,
    });
  }
  console.log("\n");

  // ─── Evaluation ────────────────────────────────────────────────────────────
  function evaluate(key: "dc" | "elo") {
    let correct = 0, brier = 0, logLoss = 0, goalErr = 0;
    for (const r of evalRows) {
      const p = r[key];
      const pick = p.H >= p.D && p.H >= p.A ? "H" : p.A >= p.D ? "A" : "D";
      if (pick === r.actual) correct++;
      let b = 0;
      for (const k of ["H", "D", "A"] as const) { const t = k === r.actual ? 1 : 0; b += (p[k] - t) ** 2; }
      brier += b;
      logLoss += -Math.log(Math.max(1e-10, p[r.actual]));
      if (key === "dc") goalErr += Math.abs(r.ehg - (r.actual === "H" || r.actual === "D" ? r.ehg : r.ehg)); // placeholder, computed below
    }
    return {
      accuracy: correct / evalRows.length,
      brier: brier / evalRows.length,
      logLoss: logLoss / evalRows.length,
      goalMAE: undefined as number | undefined,
    };
  }

  const dcEval = evaluate("dc") as typeof evaluate extends (...a: any[]) => infer R ? R : never;
  const eloEval = evaluate("elo");

  // Goal MAE (DC only): mean absolute error of expected goals vs actual
  let geTotal = 0;
  for (let idx = 0; idx < evalRows.length; idx++) {
    const fx = fixtures[WARMUP + idx]!;
    geTotal += Math.abs(evalRows[idx]!.ehg - fx.hg) + Math.abs(evalRows[idx]!.eag - fx.ag);
  }
  dcEval.goalMAE = geTotal / (evalRows.length * 2);

  const randomBrier = 2 / 3;

  const evaluation = {
    evaluatedAt: new Date().toISOString(),
    matches: evalRows.length,
    warmupExcluded: WARMUP,
    dixonColesV0: dcEval,
    eloV0Baseline: eloEval,
    randomBaselineBrier: round3(randomBrier),
    calibrationDC: calibration(evalRows.map((r) => ({ p: r.dc.H, hit: r.actual === "H" }))),
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(DB_DIR, "predictions-dc.jsonl"), predictions.map((p) => JSON.stringify(p)).join("\n") + "\n");
  fs.writeFileSync(path.join(DB_DIR, "model-eval.json"), JSON.stringify(evaluation, null, 2));

  // Final params over ALL history (for future fixtures)
  console.log("Fitting final parameters on full history...");
  const finalParams = fitParams(rows, allTeams, 80);
  const finalOut: Record<string, unknown> = {
    fittedAt: new Date().toISOString(),
    matchesUsed: rows.length,
    homeAdvantage: round3(finalParams.homeAdv),
    rho: round3(finalParams.rho),
    teams: Object.fromEntries(allTeams.map((t) => [
      t,
      { attack: round4(finalParams.attack.get(t)!), defence: round4(finalParams.defence.get(t)!) },
    ])),
  };
  fs.writeFileSync(path.join(DB_DIR, "dc-params.json"), JSON.stringify(finalOut, null, 2));

  // Report
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  EVALUATION — ${evalRows.length} matches (out-of-sample)`);
  console.log("═══════════════════════════════════════════════");
  console.log(`                 Dixon-Coles v0    Elo v0 (baseline)`);
  console.log(`  Accuracy:       ${(dcEval.accuracy * 100).toFixed(1)}%           ${(eloEval.accuracy * 100).toFixed(1)}%`);
  console.log(`  Brier score:    ${dcEval.brier.toFixed(3)}            ${eloEval.brier.toFixed(3)}   (random ${randomBrier.toFixed(3)})`);
  console.log(`  Log loss:       ${dcEval.logLoss.toFixed(3)}            ${eloEval.logLoss.toFixed(3)}`);
  console.log(`  Goal MAE:       ${dcEval.goalMAE!.toFixed(2)} goals/match`);
  console.log(`  Home advantage: ${finalParams.homeAdv.toFixed(3)} (exp scale), rho=${finalParams.rho.toFixed(3)}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\nSaved: dc-params.json, predictions-dc.jsonl, model-eval.json");
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function entropy(probs: number[]): number {
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
}

/** Reliability curve for home-win probabilities */
function calibration(pairs: { p: number; hit: boolean }[]): { bin: string; predicted: number; actual: number; count: number }[] {
  const bins = [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1.001];
  const out = [];
  for (let i = 0; i < bins.length - 1; i++) {
    const inBin = pairs.filter((x) => x.p >= bins[i]! && x.p < bins[i + 1]!);
    if (inBin.length === 0) continue;
    out.push({
      bin: `${bins[i]}–${bins[i + 1]}`,
      predicted: round3(inBin.reduce((a, x) => a + x.p, 0) / inBin.length),
      actual: round3(inBin.filter((x) => x.hit).length / inBin.length),
      count: inBin.length,
    });
  }
  return out;
}

main();
