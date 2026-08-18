/**
 * ONE PERFECT MATCH — Lifecycle Runner
 * Liverpool 3-3 Arsenal, 13 January 2016, Premier League 2015/2016
 * Source: StatsBomb Open Data — ⚠️ HISTORICAL REPLAY
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data/statsbomb/data");
const OUTPUT_DIR = path.join(ROOT, "data/match-output");
const MATCH_ID = 3754305;

async function loadJson<T>(rel: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, rel), "utf-8")) as T;
}

// Use require-style relative imports that tsx handles on Windows
// All imports happen inside main() to avoid top-level await in CJS

async function main() {
  const analytics = await import("../services/analytics/src/features/team.js");
  const elo = await import("../models/elo/src/elo.js");
  const poisson = await import("../models/poisson/src/poisson.js");
  const { quantAgent } = await import("../services/agents/src/agents/quant.js");
  const { gafferAgent } = await import("../services/agents/src/agents/gaffer.js");
  const { historianAgent } = await import("../services/agents/src/agents/historian.js");
  const { contrarianAgent } = await import("../services/agents/src/agents/contrarian.js");
  const { terrorAgent } = await import("../services/agents/src/agents/terror.js");

  const { computeTeamFeatures } = analytics;
  const { updateRatings, PL_2015_16_RATINGS } = elo;
  const { predictMatch } = poisson;
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  FootballTerror — ONE PERFECT MATCH");
  console.log("  ⚠️  HISTORICAL REPLAY — NOT LIVE DATA");
  console.log("  Liverpool 3-3 Arsenal");
  console.log("  Premier League 2015/2016, MD21, 13 Jan 2016");
  console.log("  Source: StatsBomb Open Data");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. LOAD DATA
  console.log("📡 Step 1: Loading match data...");
  const matches = await loadJson<any[]>("matches/2/27.json");
  const fixture = matches.find((m: any) => m.match_id === MATCH_ID);
  if (!fixture) throw new Error(`Match ${MATCH_ID} not found`);
  const events = await loadJson<any[]>("events/3754305.json");
  const lineups = await loadJson<any[]>("lineups/3754305.json");
  const homeTeamId = fixture.home_team.home_team_id;
  const awayTeamId = fixture.away_team.away_team_id;
  const homeTeamName = fixture.home_team.home_team_name;
  const awayTeamName = fixture.away_team.away_team_name;
  console.log(`  ✅ ${events.length} events, ${lineups.length} lineups`);
  console.log(`  📊 ${homeTeamName} ${fixture.home_score}-${fixture.away_score} ${awayTeamName}\n`);

  // 2. FEATURES
  console.log("🔢 Step 2: Computing features...");
  const hf = computeTeamFeatures(events, homeTeamId, String(MATCH_ID), "ft:statsbomb:27", true);
  const af = computeTeamFeatures(events, awayTeamId, String(MATCH_ID), "ft:statsbomb:27", false);
  (hf as any).goalsConceded = fixture.away_score;
  (af as any).goalsConceded = fixture.home_score;
  console.log(`  ${homeTeamName}: xG=${hf.xG.toFixed(2)} shots=${hf.shots} progPass=${hf.progressivePasses}`);
  console.log(`  ${awayTeamName}: xG=${af.xG.toFixed(2)} shots=${af.shots} progPass=${af.progressivePasses}\n`);

  // 3. ELO
  console.log("📊 Step 3: Elo ratings...");
  const homeElo = PL_2015_16_RATINGS[homeTeamName] ?? 1500;
  const awayElo = PL_2015_16_RATINGS[awayTeamName] ?? 1500;
  const eloResult = updateRatings(homeElo, awayElo, fixture.home_score, fixture.away_score);
  console.log(`  ${homeTeamName}: ${homeElo}→${eloResult.homeNewRating.toFixed(0)} (${eloResult.homeRatingChange >= 0 ? "+" : ""}${eloResult.homeRatingChange.toFixed(1)})`);
  console.log(`  ${awayTeamName}: ${awayElo}→${eloResult.awayNewRating.toFixed(0)} (${eloResult.awayRatingChange >= 0 ? "+" : ""}${eloResult.awayRatingChange.toFixed(1)})`);
  console.log(`  Pre-match: ${homeTeamName} ${(eloResult.homeExpectedScore * 100).toFixed(1)}% win\n`);

  // 4. POISSON
  console.log("🎯 Step 4: Poisson model...");
  const hAttack = 1.2 + (hf.xG - 1.3) * 0.5;
  const aAttack = 1.1 + (af.xG - 1.2) * 0.5;
  const poissonResult = predictMatch(hAttack, aAttack, -0.13);
  console.log(`  xG: ${homeTeamName} ${poissonResult.expectedHomeGoals} - ${awayTeamName} ${poissonResult.expectedAwayGoals}`);
  console.log(`  Win: ${(poissonResult.homeWin * 100).toFixed(1)}% | Draw ${(poissonResult.draw * 100).toFixed(1)}% | ${(poissonResult.awayWin * 100).toFixed(1)}%\n`);

  // 5. COMBINED PREDICTION
  console.log("🧠 Step 5: Combined prediction...");
  const hw = Math.round(((eloResult.homeExpectedScore + poissonResult.homeWin) / 2) * 1000) / 1000;
  const dr = Math.round(((1 - eloResult.homeExpectedScore - eloResult.awayExpectedScore + poissonResult.draw) / 2) * 1000) / 1000;
  const aw = Math.round(((eloResult.awayExpectedScore + poissonResult.awayWin) / 2) * 1000) / 1000;
  const pred = { homeWin: hw, draw: dr, awayWin: aw, expectedHomeGoals: poissonResult.expectedHomeGoals, expectedAwayGoals: poissonResult.expectedAwayGoals, scoreProbabilities: poissonResult.scoreProbabilities, confidence: 0.65, entropy: -(hw * Math.log2(hw || 0.001) + dr * Math.log2(dr || 0.001) + aw * Math.log2(aw || 0.001)) };
  console.log(`  ${homeTeamName} ${(hw * 100).toFixed(1)}% | Draw ${(dr * 100).toFixed(1)}% | ${(aw * 100).toFixed(1)}%\n`);

  // 6. POWER INDEX
  console.log("💪 Step 6: Power Index...");
  const homePI = Math.min(100, Math.max(0, 50 + (homeElo - 1500) / 10 + hf.xG * 5));
  const awayPI = Math.min(100, Math.max(0, 50 + (awayElo - 1500) / 10 + af.xG * 5));
  console.log(`  ${homeTeamName}: ${homePI.toFixed(1)} | ${awayTeamName}: ${awayPI.toFixed(1)}\n`);

  // 7. TERROR INDEX
  console.log("🔥 Step 7: Terror Index...");
  const scoring = (poissonResult.expectedHomeGoals + poissonResult.expectedAwayGoals) * 15;
  const uncertain = pred.confidence < 0.6 ? 30 : pred.confidence < 0.7 ? 20 : 10;
  const ti = Math.min(100, Math.max(0, 70 * 0.3 + scoring * 0.3 + uncertain * 0.2 + 25 * 0.2));
  const tl = ti >= 85 ? "TOTAL WAR" : ti >= 70 ? "DANGEROUS" : ti >= 50 ? "HEATED" : ti >= 30 ? "WATCHABLE" : "DORMANT";
  console.log(`  ${ti.toFixed(1)}/100 — ${tl}\n`);

  // 8. AGENTS
  console.log("🤖 Step 8: Running agents...");
  const ctx = {
    fixtureId: `ft:statsbomb:${MATCH_ID}`, homeTeamId: `ft:statsbomb:${homeTeamId}`, awayTeamId: `ft:statsbomb:${awayTeamId}`,
    homeTeamName, awayTeamName,
    fixture: { homeScore: fixture.home_score, awayScore: fixture.away_score, status: "finished", slug: "liverpool-arsenal-2016-01-13" },
    homeFeatures: hf, awayFeatures: af, homeElo: eloResult.homeNewRating, awayElo: eloResult.awayNewRating,
    prediction: pred, events, lineups,
  };
  const allClaims: any[] = []; const runs: any[] = [];

  const qr = await quantAgent.run(ctx); allClaims.push(...qr.claims); runs.push(qr.run);
  console.log(`  ✅ Quant: ${qr.observations.length} obs, ${qr.claims.length} claims`);
  const gr = await gafferAgent.run(ctx); allClaims.push(...gr.claims); runs.push(gr.run);
  console.log(`  ✅ Gaffer: ${gr.observations.length} obs, ${gr.claims.length} claims`);
  const hr = await historianAgent.run(ctx); allClaims.push(...hr.claims); runs.push(hr.run);
  console.log(`  ✅ Historian: ${hr.observations.length} obs, ${hr.claims.length} claims`);
  const cr = await contrarianAgent.run(ctx); allClaims.push(...cr.claims); runs.push(cr.run);
  console.log(`  ✅ Contrarian: ${cr.observations.length} obs, ${cr.claims.length} claims`);
  const tr = await terrorAgent.run(ctx, allClaims); allClaims.push(...tr.claims); runs.push(tr.run);
  console.log(`  ✅ The Terror: verdict synthesized\n`);

  // 9. SAVE
  console.log("📋 Step 9: Saving output...");
  const output = {
    fixture: { id: `ft:statsbomb:${MATCH_ID}`, homeTeamName, awayTeamName, homeScore: fixture.home_score, awayScore: fixture.away_score, date: fixture.match_date, venue: fixture.stadium?.name, competition: "Premier League 2015/2016", matchday: fixture.match_week, slug: "liverpool-arsenal-2016-01-13", status: "finished" },
    homeTeamId, awayTeamId, homeTeamName, awayTeamName,
    homeFeatures: hf, awayFeatures: af,
    elo: { homeExpected: eloResult.homeExpectedScore, awayExpected: eloResult.awayExpectedScore, homeRating: eloResult.homeNewRating, awayRating: eloResult.awayNewRating },
    prediction: pred, agentRuns: runs, allClaims, verdict: tr.verdict,
    events, lineups,
    generatedAt: new Date().toISOString(), historicalReplay: true,
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, "liverpool-arsenal-2016-01-13.json");
  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`  ✅ Saved to ${outPath}\n`);

  // VERDICT
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  📰 VERDICT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ${tr.verdict?.headline}`);
  console.log(`\n  ${tr.verdict?.summary}`);
  console.log("\n  KEY INSIGHTS:");
  for (const i of tr.verdict?.keyInsights ?? []) console.log(`  • ${i}`);
  console.log("\n  AGENT CONTRIBUTIONS:");
  for (const [t, txt] of Object.entries(tr.verdict?.agentContributions ?? {})) console.log(`  [${t}] ${txt}`);
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ COMPLETE — HISTORICAL REPLAY");
  console.log("  ⚠️  NOT live data. All from StatsBomb Open Data.");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
