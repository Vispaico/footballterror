# FootballTerror — Server Setup Instructions

> Hand this document to the Hermes agent running on the server.
> It assumes: Ubuntu/Debian server, Coolify installed, Node 22 available (or installable), git access to github.com/Vispaico/footballterror, and the existing Coolify resources `footballterror-db` (PostgreSQL) and `footballterror-api` already created.

## Goal

1. Deploy API v2 (serves 418 historical matches + Dixon-Coles predictions + model performance)
2. Set up a daily cron job that pulls Premier League 2026/27 fixtures/results from football-charts.com into the data store
3. Everything idempotent — safe to re-run any step

---

## Step 1 — Pull latest repo

```bash
cd /opt   # or wherever apps live on this server
git clone https://github.com/Vispaico/footballterror.git footballterror 2>/dev/null || (cd footballterror && git pull)
cd footballterror
```

If pnpm is missing: `corepack enable && corepack prepare pnpm@11.20.0 --activate`

```bash
pnpm install --frozen-lockfile
```

## Step 2 — Data (already committed — verify only)

All derived bulk data is committed to `main` under `data/db/`:
fixtures.jsonl (418), predictions-dc.jsonl (358), dc-params.json,
model-eval.json, final-ratings.json, and 418 Match Room payloads.

Verify after pulling:

```bash
wc -l data/db/fixtures.jsonl          # expect 418
cat data/db/model-eval.json           # DC accuracy ~45.8%, Brier ~0.644
```

(To regenerate from scratch instead, see scripts/ingest-history.ts and
scripts/fit-dixon-coles.ts — requires downloading StatsBomb event files.)

```bash
# Download StatsBomb match lists for PL seasons
mkdir -p data/statsbomb/data/matches/2
curl -sL https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/2/27.json -o data/statsbomb/data/matches/2/27.json
curl -sL https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/2/44.json -o data/statsbomb/data/matches/2/44.json

# Download all event files (~418 files, ~5 min at 300ms delay)
node -e "
const fs=require('fs');
(async()=>{
  const all=[...JSON.parse(fs.readFileSync('data/statsbomb/data/matches/2/27.json')),...JSON.parse(fs.readFileSync('data/statsbomb/data/matches/2/44.json'))];
  fs.mkdirSync('data/statsbomb/data/events',{recursive:true});
  let fail=0;
  for(const m of all){
    const id=m.match_id;
    if(!fs.existsSync('data/statsbomb/data/events/'+id+'.json')){
      try{
        const r=await fetch('https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/'+id+'.json');
        if(!r.ok) throw new Error(r.status);
        fs.writeFileSync('data/statsbomb/data/events/'+id+'.json',JSON.stringify(await r.json()));
        await new Promise(r=>setTimeout(r,300));
      }catch(e){fail++;console.error('fail',id,e.message)}
    }
  }
  console.log('DONE, failures:',fail);
})();"

# Ingest → fixtures/features/predictions/ratings JSONL
npx tsx scripts/ingest-history.ts

# Fit Dixon-Coles + backtest
npx tsx scripts/fit-dixon-coles.ts
```

Verify:
```bash
wc -l data/db/fixtures.jsonl          # expect 418
ls data/db/match-output | wc -l       # expect 418
cat data/db/model-eval.json           # DC accuracy ~45.8%, Brier ~0.644
```

## Step 3 — Make bulk data visible to the Coolify API container

The Coolify `footballterror-api` service runs from a Dockerfile with `DATA_DIR=/app/data`. The repo's `data/db` needs to be inside that image OR mounted.

**Option A (recommended): commit the small derived files to a data branch**

The derived files are small (a few MB total, events excluded):

```bash
git checkout -b data-derived 2>/dev/null || git checkout data-derived
git add -f data/db/fixtures.jsonl data/db/clubs.jsonl data/db/features.jsonl \
          data/db/ratings.jsonl data/db/predictions.jsonl data/db/predictions-dc.jsonl \
          data/db/dc-params.json data/db/model-eval.json data/db/final-ratings.json
git add -f data/db/match-output/
git commit -m "derived data: bulk store + DC params"
git push origin data-derived --force
git checkout main
```

Then in **Coolify → footballterror-api → Settings**, change the git branch to `data-derived`, keep Dockerfile path `./apps/api/Dockerfile`, and Redeploy.

**Option B: volume mount**

In Coolify → footballterror-api → Storage, mount a host directory containing `data/db` to `/app/data`. Copy the generated `data/db` folder to that host path first.

Pick whichever fits your Coolify setup; Option A keeps everything reproducible from git.

## Step 3b — Migrate data into PostgreSQL

The Coolify `footballterror-db` resource hosts the app's Postgres. Load the bulk store into it:

```bash
# Get the internal connection string from Coolify → footballterror-db (DATABASE_URL env var),
# or construct: postgresql://footballterror:<password>@<db-internal-host>:5432/footballterror
export DATABASE_URL="postgresql://footballterror:<password>@<db-internal-host>:5432/footballterror"

node_modules/.bin/tsx scripts/migrate-to-postgres.ts
```

Expected output ends with counts: clubs 29, fixtures 418, predictions 776,
agent_analysis 289. Idempotent — safe to re-run.

(If the local `.env` already has a working DATABASE_URL pointing at the server
DB, just run `pnpm tsx scripts/migrate-to-postgres.ts` with no export.)

## Step 4 — Verify deployed API

```bash
curl https://api.footballterror.com/health
curl "https://api.footballterror.com/api/fixtures?team=liverpool" | head -c 200   # expect total: 40
curl https://api.footballterror.com/api/power-index | head -c 300                 # expect 29 teams, elo-replay-v0
curl https://api.footballterror.com/api/models/performance | head -c 300          # expect DC metrics
curl "https://api.footballterror.com/api/match/southampton-vs-swansea-city-2015-09-26/prediction" | head -c 400  # expect dixon-coles-v0
```

All should return 200 with real data.

## Step 5 — Daily football-charts cron job

Create `/opt/footballterror/scripts/cron-sync-current.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/footballterror

export $(grep -E '^(FOOTBALL_CHARTS_KEY|FOOTBALL_CHARTS_BASE_URL)=' .env | xargs)

node_modules/.bin/tsx scripts/sync-football-charts.ts >> data/logs/sync.log 2>&1
```

Create the sync script `scripts/sync-football-charts.ts` (see below), make the shell script executable (`chmod +x`), then register cron:

```bash
crontab -l 2>/dev/null; echo "30 6 * * * /opt/footballterror/scripts/cron-sync-current.sh" | crontab -
```

### scripts/sync-football-charts.ts

```typescript
/**
 * Daily sync: pull current PL season fixtures/results from football-charts.
 * Appends new finished matches to data/db/current-season.jsonl (idempotent by match id).
 */
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.FOOTBALL_CHARTS_KEY!;
const BASE = process.env.FOOTBALL_CHARTS_BASE_URL ?? "https://footballcharts-backend.onrender.com/api/v1";
const DB_DIR = path.resolve(process.cwd(), "data/db");

async function api(pathname: string): Promise<any> {
  const resp = await fetch(`${BASE}${pathname}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  return resp.json();
}

async function main() {
  console.log(`[sync] ${new Date().toISOString()}`);
  const leaguesResp = await api("/leagues/");
  const pl = (leaguesResp.leagues ?? []).find((l: any) =>
    String(l.name).toLowerCase().includes("premier league") && String(l.country ?? "").toLowerCase().includes("england"));
  if (!pl) { console.error("[sync] PL not found in leagues"); process.exit(1); }
  const code = pl.code ?? pl.id;
  console.log(`[sync] PL code: ${code}`);

  const results = await api(`/leagues/${code}/results/`);
  const matches: any[] = results.results ?? results.matches ?? [];
  console.log(`[sync] fetched ${matches.length} results`);

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
    if (seen.has(pid)) continue;
    const rec = {
      providerId: pid,
      provider: "football-charts",
      date: m.kickoff ?? m.date,
      homeTeamName: m.home_team?.name ?? m.home_team,
      awayTeamName: m.away_team?.name ?? m.away_team,
      homeScore: m.home_goals ?? null,
      awayScore: m.away_goals ?? null,
      raw: m,
      syncedAt: new Date().toISOString(),
    };
    fs.appendFileSync(outFile, JSON.stringify(rec) + "\n");
    added++;
  }
  console.log(`[sync] added ${added} new matches (total ${seen.size + added})`);
}

main().catch((e) => { console.error("[sync] FAILED:", e.message); process.exit(1); });
```

Notes for the agent:
- Create `.env` at repo root with `FOOTBALL_CHARTS_KEY=<key>` (ask the owner if not present).
- `mkdir -p data/logs`
- Test manually once: `bash scripts/cron-sync-current.sh && tail data/logs/sync.log`
- If the football-charts response shape differs (field names), adapt the field mapping in the sync script — log one full match object first: add `console.log(JSON.stringify(matches[0]))` temporarily.

## Step 6 — Report

When done, output a summary:
- API version deployed + verification curl results
- Cron registered (`crontab -l`)
- Sync test result (how many current-season matches pulled)

Do NOT proceed to UI changes, database migrations, or anything else. Stop after this report.
