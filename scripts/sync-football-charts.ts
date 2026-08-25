/**
 * Daily sync: pull current PL season fixtures/results from football-charts.
 * Appends new finished matches to data/db/current-season.jsonl (idempotent by providerId).
 * Run via scripts/cron-sync-current.sh (cron) or manually.
 */
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.FOOTBALL_CHARTS_KEY;
const BASE = process.env.FOOTBALL_CHARTS_BASE_URL ?? "https://footballcharts-backend.onrender.com/api/v1";
const DB_DIR = path.resolve(process.cwd(), "data/db");

async function api(pathname: string): Promise<any> {
  const resp = await fetch(`${BASE}${pathname}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  return resp.json();
}

async function main() {
  if (!KEY) { console.error("[sync] FOOTBALL_CHARTS_KEY not set"); process.exit(1); }
  console.log(`[sync] ${new Date().toISOString()}`);

  const leaguesResp = await api("/leagues/");
  const pl = (leaguesResp.leagues ?? []).find((l: any) =>
    String(l.name ?? "").toLowerCase().includes("premier league"));
  if (!pl) { console.error("[sync] PL not found. Leagues:", (leaguesResp.leagues ?? []).map((l: any) => l.name).slice(0, 10)); process.exit(1); }
  const code = pl.code ?? pl.id ?? pl.slug;
  console.log(`[sync] PL code: ${code}`);

  const results = await api(`/leagues/${code}/results/`);
  const matches: any[] = results.results ?? results.matches ?? results.fixtures ?? [];
  console.log(`[sync] fetched ${matches.length} result entries`);
  if (matches.length > 0) console.log(`[sync] sample fields:`, Object.keys(matches[0]).join(", "));

  fs.mkdirSync(DB_DIR, { recursive: true });
  const outFile = path.join(DB_DIR, "current-season.jsonl");
  const seen = new Set<string>();
  if (fs.existsSync(outFile)) {
    for (const line of fs.readFileSync(outFile, "utf8").split("\n").filter(Boolean)) {
      try { seen.add(String(JSON.parse(line).providerId)); } catch {}
    }
  }

  let added = 0;
  for (const m of matches) {
    const pid = String(m.id ?? m.slug);
    if (!pid || seen.has(pid)) continue;
    const rec = {
      providerId: pid,
      provider: "football-charts",
      date: m.kickoff ?? m.date ?? m.utc_date ?? null,
      homeTeamName: m.home_team?.name ?? m.home_team_name ?? m.home_team,
      awayTeamName: m.away_team?.name ?? m.away_team_name ?? m.away_team,
      homeScore: m.home_goals ?? m.score?.home ?? null,
      awayScore: m.away_goals ?? m.score?.away ?? null,
      raw: m,
      syncedAt: new Date().toISOString(),
    };
    fs.appendFileSync(outFile, JSON.stringify(rec) + "\n");
    added++;
  }
  console.log(`[sync] added ${added} new (store total: ${seen.size + added})`);
}

main().catch((e) => { console.error("[sync] FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
