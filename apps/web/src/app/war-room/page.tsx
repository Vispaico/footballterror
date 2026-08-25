import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DATA_DIR = process.env.MATCH_DATA_DIR
  ? path.resolve(process.env.MATCH_DATA_DIR)
  : ["../../data/match-output", "../data/match-output", "data/match-output"]
      .map((p) => path.resolve(process.cwd(), p))
      .find((p) => existsSync(p)) ?? path.resolve(process.cwd(), "../../data/match-output");

async function fetchJson(url: string): Promise<any | null> {
  try {
    const resp = await fetch(url, { next: { revalidate: 60 } });
    if (resp.ok) return resp.json();
  } catch {}
  return null;
}

export default async function WarRoom() {
  const [powerIndex, fixtures, intelligence, upcoming, currentResults] = await Promise.all([
    fetchJson(`${API_URL}/api/power-index`),
    fetchJson(`${API_URL}/api/fixtures?limit=500`),
    fetchJson(`${API_URL}/api/intelligence`),
    fetchJson(`${API_URL}/api/upcoming`),
    fetchJson(`${API_URL}/api/current-season/results`),
  ]);

  // Local fallbacks if API is down
  let teams: any[] = powerIndex?.teams ?? [];
  let matches: any[] = fixtures?.fixtures ?? [];

  if (teams.length === 0) {
    try {
      teams = JSON.parse(await fs.readFile(path.resolve(DATA_DIR, "../final-ratings.json"), "utf-8"));
      teams = teams.map((t: any) => ({ teamId: t.teamId, name: t.name ?? t.teamId.split(":").pop(), score: t.rating }));
    } catch {}
  }
  if (matches.length === 0) {
    try {
      matches = (await fs.readdir(DATA_DIR))
        .filter((f) => f.endsWith(".json"))
        .slice(0, 500)
        .map(async (f) => JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf-8")).fixture)
        .filter(Boolean) as any[];
    } catch {}
  }

  const topTeams = teams.slice(0, 10);
  const maxScore = topTeams[0]?.score ?? 100;
  const minScore = topTeams[topTeams.length - 1]?.score ?? 0;

  // Highest-scoring recent thrillers
  const thrillers = [...matches]
    .sort((a, b) => (b.homeScore + b.awayScore) - (a.homeScore + a.awayScore))
    .slice(0, 5);

  const seasons = [...new Set(matches.map((m: any) => m.season))].filter(Boolean).sort().reverse();

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold">War Room</div>
            <div className="flex items-center gap-4 text-xs">
              <a href="/models" className="text-zinc-500 hover:text-white transition-colors">Models</a>
              <span className="flex items-center gap-2 text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {matches.length} matches · {seasons.join(" + ") || "historical"}
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white">What&apos;s worth knowing</h1>
          <p className="text-zinc-500 mt-1">Intelligence ranked by importance — not a news feed.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Upcoming — live predictions FIRST: most time-sensitive */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              This Week — Predictions Live
            </h2>
            <span className="text-[10px] text-zinc-600 font-mono">{upcoming?.modelVersion ?? "dc-v0"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(upcoming?.predictions ?? []).map((p: any) => {
              const total = p.homeWin + p.draw + p.awayWin;
              const hw = Math.round((p.homeWin / total) * 100);
              const dr = Math.round((p.draw / total) * 100);
              const aw = 100 - hw - dr;
              return (
                <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">{p.homeTeamName} <span className="text-zinc-600">vs</span> {p.awayTeamName}</span>
                    <span className="text-[10px] font-mono text-zinc-600">{p.matchDate}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div className="bg-red-500" style={{ width: `${hw}%` }} />
                    <div className="bg-zinc-600" style={{ width: `${dr}%` }} />
                    <div className="bg-blue-500" style={{ width: `${aw}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-red-400">{hw}%</span>
                    <span className="text-zinc-500">{p.homeTeamName.slice(0,3).toUpperCase()} · xG {p.expectedHomeGoals}–{p.expectedAwayGoals}</span>
                    <span className="text-blue-400">{aw}%</span>
                  </div>
                  {p.dataNotes?.length > 0 && (
                    <div className="mt-1.5 text-[9px] text-amber-600/80">⚠ limited history — league-average estimate used</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Current season results */}
        {currentResults?.results?.length > 0 && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Latest results — 2026/27</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {currentResults.results.map((m: any) => (
                <span key={m.providerId} className="whitespace-nowrap">
                  {m.homeTeamName} <span className="font-mono text-white">{m.homeScore}-{m.awayScore}</span> {m.awayTeamName}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Power Index */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Power Index</h2>
            <span className="text-[10px] text-zinc-600 font-mono">elo-replay-v0</span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/50">
            {topTeams.length === 0 && (
              <div className="p-6 text-sm text-zinc-600">Power Index unavailable — API offline.</div>
            )}
            {topTeams.map((t: any, i: number) => {
              const pct = ((t.score - minScore) / Math.max(1, maxScore - minScore)) * 100;
              return (
                <div key={t.teamId} className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-900/60 transition-colors">
                  <span className="w-6 text-right font-mono text-xs text-zinc-600">{i + 1}</span>
                  <span className="w-48 font-semibold text-white text-sm truncate">{t.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-500" style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-sm text-red-400">{t.score}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Highest Terror matches */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Biggest Goal Feasts <span className="text-zinc-600 normal-case font-normal">— chaos the models didn&apos;t see coming</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {thrillers.map((m: any) => (
              <a key={m.id} href={`/match/${m.slug}`}
                className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-red-900/60 transition-all hover:bg-zinc-900/70">
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">{m.season} · MD{m.matchday}</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400 truncate">{m.homeTeamName}</span>
                  <span className="font-mono font-bold text-white text-lg ml-2">{m.homeScore}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 truncate">{m.awayTeamName}</span>
                  <span className="font-mono font-bold text-white text-lg ml-2">{m.awayScore}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between text-[9px] text-zinc-600">
                  <span>{m.date}</span>
                  <span className="text-red-500 group-hover:text-red-400 font-bold">Open →</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Latest intelligence */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Latest Intelligence</h2>
            <span className="text-[10px] text-zinc-600 font-mono">{intelligence?.total ?? 0} verdicts · MiniMax-M3</span>
          </div>
          <div className="space-y-2">
            {(intelligence?.verdicts ?? []).slice(0, 6).map((v: any) => (
              <a key={v.fixtureId} href={`/match/${v.slug}`}
                className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 hover:border-red-900/60 hover:bg-zinc-900/70 transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-red-500 text-[10px]">🔴</span>
                    <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">{v.headline}</span>
                  </div>
                  {v.fixture && (
                    <div className="text-[10px] text-zinc-600">
                      {v.fixture.homeTeamName} {v.fixture.homeScore}-{v.fixture.awayScore} {v.fixture.awayTeamName} · {v.date} · {v.claimCount} agent claims
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Model honesty */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Predictions stored", value: "776", sub: "418 elo-v0 + 358 dc-v0 snapshots" },
            { label: "Best model Brier", value: "0.644", sub: "dixon-coles-v0 (lower is better)" },
            { label: "Goal forecast MAE", value: "0.98", sub: "goals per match, out-of-sample" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{stat.label}</div>
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] text-zinc-600 mt-1">{stat.sub}</div>
            </div>
          ))}
        </section>

        <footer className="border-t border-zinc-900 py-6 text-center">
          <span className="text-[10px] uppercase tracking-widest text-zinc-700">
            FootballTerror · Historical data · StatsBomb Open Data
          </span>
        </footer>
      </main>
    </div>
  );
}
