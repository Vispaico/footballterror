import fs from "node:fs/promises";
import path from "node:path";

const MATCHES_DIR = path.resolve(process.cwd(), "../../data/match-output");

async function getMatch(slug: string) {
  try {
    const data = await fs.readFile(path.join(MATCHES_DIR, `${slug}.json`), "utf-8");
    return JSON.parse(data);
  } catch { return null; }
}

function ScoreHeader({ match }: { match: any }) {
  return (
    <div className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-black px-6 py-8">
      <div className="mb-2 text-center text-xs font-bold uppercase tracking-[0.3em] text-red-500">
        ⚠️ Historical Replay — Not Live Data
      </div>
      <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-zinc-600">
        {match.fixture.competition} · MD{match.fixture.matchday} · {match.fixture.date}
      </div>
      <div className="flex items-center justify-center gap-8 mt-4">
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{match.homeTeamName}</div>
          <div className="text-xs text-zinc-500">Home</div>
        </div>
        <div className="text-6xl font-black text-white tabular-nums">
          {match.fixture.homeScore}
          <span className="mx-2 text-zinc-600">-</span>
          {match.fixture.awayScore}
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold text-white">{match.awayTeamName}</div>
          <div className="text-xs text-zinc-500">Away</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-zinc-500">
        {match.fixture.venue} · Full Time
      </div>
    </div>
  );
}

function StatBar({ label, home, away, homeColor = "bg-red-500", awayColor = "bg-blue-500" }: { label: string; home: number; away: number; homeColor?: string; awayColor?: string }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-mono text-red-400">{home}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono text-blue-400">{away}</span>
      </div>
      <div className="h-1.5 flex rounded-full overflow-hidden bg-zinc-800">
        <div className={`${homeColor} rounded-l-full transition-all`} style={{ width: `${homePct}%` }} />
        <div className={`${awayColor} rounded-r-full transition-all`} style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900/50 ${className}`}>
      <div className="border-b border-zinc-800 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ProbabilityRing({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = (value * 100).toFixed(1);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value * circumference);
  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#27272a" strokeWidth="6" />
        <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 44 44)" className="transition-all duration-1000" />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central" className="fill-white text-lg font-bold">{pct}%</text>
      </svg>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
  );
}

function TerrorMeter({ score, level }: { score: number; level: string }) {
  const colors: Record<string, string> = { DORMANT: "#52525b", WATCHABLE: "#eab308", HEATED: "#f97316", DANGEROUS: "#ef4444", TERROR: "#dc2626", "TOTAL WAR": "#991b1b" };
  const color = colors[level] || "#52525b";
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-4xl font-black tabular-nums" style={{ color }}>{score.toFixed(1)}</div>
        <div>
          <div className="text-xs uppercase tracking-widest font-bold" style={{ color }}>{level}</div>
          <div className="text-[10px] text-zinc-600">Terror Index</div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-zinc-700">
        <span>0 DORMANT</span><span>30 WATCHABLE</span><span>50 HEATED</span><span>70 DANGEROUS</span><span>85 TERROR</span><span>96 TOTAL WAR</span>
      </div>
    </div>
  );
}

function AgentVerdict({ verdict }: { verdict: any }) {
  if (!verdict) return null;
  return (
    <div className="rounded-lg border border-red-900/50 bg-gradient-to-br from-red-950/30 to-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-500 text-lg">🔴</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-red-400">The Terror — Verdict</h3>
      </div>
      <div className="text-lg font-bold text-white mb-2">{verdict.headline}</div>
      <div className="text-sm text-zinc-300 leading-relaxed mb-4">{verdict.summary}</div>
      <div className="space-y-2">
        {verdict.keyInsights?.map((insight: string, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 text-xs">▸</span>
            <span className="text-sm text-zinc-300">{insight}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Agent Contributions</div>
        <div className="space-y-1.5">
          {Object.entries(verdict.agentContributions || {}).map(([type, text]) => (
            <div key={type} className="flex gap-2">
              <span className="text-[10px] font-bold uppercase text-zinc-500 w-20 shrink-0">[{type}]</span>
              <span className="text-xs text-zinc-400">{String(text).slice(0, 120)}...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function EvidenceTag({ type }: { type: string }) {
  const colors: Record<string, string> = { FACT: "bg-green-900/50 text-green-400", MODEL_OUTPUT: "bg-blue-900/50 text-blue-400", FORECAST: "bg-purple-900/50 text-purple-400", INFERENCE: "bg-amber-900/50 text-amber-400", OPINION: "bg-pink-900/50 text-pink-400", UNKNOWN: "bg-zinc-800 text-zinc-500" };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors[type] || colors.UNKNOWN}`}>{type}</span>;
}

export default async function MatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const match = await getMatch(slug);
  if (!match) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Match not found: {slug}</div>;

  const hf = match.homeFeatures;
  const af = match.awayFeatures;

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Score Header */}
      <ScoreHeader match={match} />

      {/* Compute Terror Index from match data */}
      {(() => {
        const ti = Math.min(100, Math.max(0, 70 * 0.3 + ((match.prediction.expectedHomeGoals + match.prediction.expectedAwayGoals) * 15) * 0.3 + (match.prediction.confidence < 0.6 ? 30 : match.prediction.confidence < 0.7 ? 20 : 10) * 0.2 + 25 * 0.2));
        const tl = ti >= 85 ? "TOTAL WAR" : ti >= 70 ? "DANGEROUS" : ti >= 50 ? "HEATED" : ti >= 30 ? "WATCHABLE" : "DORMANT";
        return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Pre-Match Prediction">
            <div className="flex items-center justify-center gap-6 py-2">
              <ProbabilityRing label={match.homeTeamName} value={match.prediction.homeWin} color="#ef4444" />
              <ProbabilityRing label="Draw" value={match.prediction.draw} color="#71717a" />
              <ProbabilityRing label={match.awayTeamName} value={match.prediction.awayWin} color="#3b82f6" />
            </div>
            <div className="text-center text-[10px] text-zinc-600 mt-2">
              Confidence: {(match.prediction.confidence * 100).toFixed(0)}% · Entropy: {match.prediction.entropy.toFixed(2)}
            </div>
          </Card>

          <Card title="Terror Index">
            <TerrorMeter score={ti} level={tl} />
          </Card>
        </div>

        {/* Power Index */}
        <Card title="Power Index">
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400 font-bold">{match.homeTeamName}</span>
                <span className="text-zinc-500">Elo: {match.elo.homeRating.toFixed(0)}</span>
                <span className="text-blue-400 font-bold">{match.awayTeamName}</span>
              </div>
              <div className="h-3 flex rounded-full overflow-hidden bg-zinc-800">
                <div className="bg-red-500 rounded-l-full transition-all" style={{ width: `${(58.9 / (58.9 + 65.8)) * 100}%` }} />
                <div className="bg-blue-500 rounded-r-full transition-all" style={{ width: `${(65.8 / (58.9 + 65.8)) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs font-mono text-red-400">58.9</span>
                <span className="text-xs font-mono text-blue-400">65.8</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Match Stats */}
        <Card title="Match Intelligence">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-widest">Shots & xG</div>
              <StatBar label="Shots" home={hf.shots} away={af.shots} />
              <StatBar label="xG" home={Math.round(hf.xG * 100)} away={Math.round(af.xG * 100)} />
              <StatBar label="Shots On Target" home={hf.shotsOnTarget} away={af.shotsOnTarget} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-widest">Possession & Passing</div>
              <StatBar label="Progressive Passes" home={hf.progressivePasses} away={af.progressivePasses} />
              <StatBar label="Progressive Carries" home={hf.progressiveCarries} away={af.progressiveCarries} />
              <StatBar label="Pressures" home={hf.pressures} away={af.pressures} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-zinc-800">
            <div>
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-widest">Defensive</div>
              <StatBar label="Tackles" home={hf.tackles} away={af.tackles} />
              <StatBar label="Interceptions" home={hf.interceptions} away={af.interceptions} />
              <StatBar label="Clearances" home={hf.clearances} away={af.clearances} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-widest">Discipline</div>
              <StatBar label="Fouls" home={hf.fouls} away={af.fouls} />
              <StatBar label="Yellow Cards" home={hf.yellowCards} away={af.yellowCards} />
              <StatBar label="Red Cards" home={hf.redCards} away={af.redCards} />
            </div>
          </div>
        </Card>

        {/* The Terror Verdict */}
        <AgentVerdict verdict={match.verdict} />

        {/* Agent Evidence */}
        <Card title="Agent Evidence">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {match.allClaims?.map((claim: any, i: number) => (
              <div key={i} className="border-l-2 border-zinc-800 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">{claim.agentType}</span>
                  <EvidenceTag type={claim.claimType} />
                  <span className="text-[10px] text-zinc-700">{(claim.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <div className="text-sm text-zinc-300">{claim.claim}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Model Details */}
        <div className="grid grid-cols-2 gap-4">
          <Card title="Elo Model">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Home Rating</span><span className="font-mono text-white">{match.elo.homeRating.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Away Rating</span><span className="font-mono text-white">{match.elo.awayRating.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Home Win Prob</span><span className="font-mono text-white">{(match.elo.homeExpected * 100).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Away Win Prob</span><span className="font-mono text-white">{(match.elo.awayExpected * 100).toFixed(1)}%</span></div>
            </div>
          </Card>
          <Card title="Poisson Model">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Expected Home Goals</span><span className="font-mono text-white">{match.prediction.expectedHomeGoals}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Expected Away Goals</span><span className="font-mono text-white">{match.prediction.expectedAwayGoals}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Model Version</span><span className="font-mono text-white">Dixon-Coles ρ=-0.13</span></div>
              <div className="mt-2 pt-2 border-t border-zinc-800">
                <div className="text-[10px] text-zinc-600 mb-1">Top Score Probabilities</div>
                {match.prediction.scoreProbabilities?.slice(0, 3).map((sp: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">{sp.homeGoals}-{sp.awayGoals}</span>
                    <span className="font-mono text-white">{(sp.probability * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-zinc-900">
          <div className="text-[10px] uppercase tracking-widest text-zinc-700">
            FootballTerror · Historical Replay · StatsBomb Open Data
          </div>
        </div>
      </div>
        );
      })()}
    </div>
  );
}
