/**
 * Daily sync: pull current PL season fixtures/results from football-charts.
 * Appends new finished matches to data/db/current-season.jsonl (idempotent by providerId).
 * Run via scripts/cron-sync-current.sh (cron) or manually.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const leagues = leaguesResp.leagues ?? [];
  // English Premier League specifically (several leagues share the name)
  const pl = leagues.find((l: any) =>
    String(l.country ?? "").toLowerCase() === "england"
    && String(l.name ?? "").toLowerCase().includes("premier league"))
    ?? leagues.find((l: any) => l.league === "england1");
  if (!pl) { console.error("[sync] English PL not found. Sample:", leagues.slice(0, 5).map((l: any) => `${l.league} (${l.country})`)); process.exit(1); }
  const code = pl.league;
  const seasons: string[] = pl.seasons ?? [];
  const currentSeason = seasons[0]; // API lists newest first
  console.log(`[sync] PL: ${pl.name} (${pl.country}) code=${code} seasons=[${seasons.join(", ")}]`);
  if (!currentSeason) { console.error("[sync] No seasons listed for PL"); process.exit(1); }

  const results = await api(`/leagues/${code}/results/?season=${encodeURIComponent(currentSeason)}`);
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
    // Actual API shape: score "3:0" string, homeTeam/awayTeam names
    const scoreParts = String(m.score ?? "").split(":");
    const rec = {
      providerId: pid,
      provider: "football-charts",
      date: m.date ? `${m.date}T${m.time ?? "00:00:00"}Z` : null,
      homeTeamName: m.homeTeam ?? m.home_team_name ?? m.home_team?.name ?? null,
      awayTeamName: m.awayTeam ?? m.away_team_name ?? m.away_team?.name ?? null,
      homeScore: scoreParts.length === 2 && scoreParts[0] !== "" ? parseInt(scoreParts[0]!, 10) : null,
      awayScore: scoreParts.length === 2 && scoreParts[1] !== "" ? parseInt(scoreParts[1]!, 10) : null,
      season: currentSeason,
      raw: m,
      syncedAt: new Date().toISOString(),
    };
    if (!rec.homeTeamName || !rec.awayTeamName) {
      console.warn(`[sync] skipping malformed entry ${pid}:`, JSON.stringify(m).slice(0, 120));
      continue;
    }
    fs.appendFileSync(outFile, JSON.stringify(rec) + "\n");
    added++;
  }
  console.log(`[sync] results: added ${added} new (store total: ${seen.size + added})`);

  // Upcoming fixtures → separate store for predictions
  try {
    const fixturesResp = await api(`/leagues/${code}/fixtures/?season=${encodeURIComponent(currentSeason)}`);
    const fixturesList: any[] = fixturesResp.fixtures ?? fixturesResp.matches ?? [];
    const fixFile = path.join(DB_DIR, "current-season-fixtures.jsonl");
    const fixSeen = new Set<string>();
    if (fs.existsSync(fixFile)) {
      for (const line of fs.readFileSync(fixFile, "utf8").split("\n").filter(Boolean)) {
        try { fixSeen.add(String(JSON.parse(line).providerId)); } catch {}
      }
    }
    let fxAdded = 0;
    for (const m of fixturesList) {
      const pid = String(m.id ?? m.slug);
      if (!pid || fixSeen.has(pid)) continue;
      fs.appendFileSync(fixFile, JSON.stringify({ providerId: pid, provider: "football-charts", season: currentSeason, raw: m, syncedAt: new Date().toISOString() }) + "\n");
      fxAdded++;
    }
    console.log(`[sync] fixtures: added ${fxAdded} new (store total: ${fixSeen.size + fxAdded})`);
  } catch (e) {
    console.warn(`[sync] fixtures fetch failed (non-fatal):`, e instanceof Error ? e.message : e);
  }
}

main().catch((e) => { console.error("[sync] FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
