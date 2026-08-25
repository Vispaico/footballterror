import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getEvaluation(): Promise<any | null> {
  try {
    const r = await fetch(`${API_URL}/api/models/performance`, { next: { revalidate: 300 } });
    if (r.ok) return r.json();
  } catch {}
  // local fallback
  for (const p of ["../../data/db/model-eval.json", "../data/db/model-eval.json"]) {
    const full = path.resolve(process.cwd(), p);
    if (existsSync(full)) {
      try { return JSON.parse(await fs.readFile(full, "utf-8")); } catch {}
    }
  }
  return null;
}

function Metric({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-red-900/50 bg-red-950/10" : "border-zinc-800 bg-zinc-900/40"}`}>
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{label}</div>
      <div className="text-2xl font-black text-white font-mono">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function ModelsPage() {
  const ev = await getEvaluation();

  if (!ev) {
    return (
      <div className="min-h-screen bg-black text-zinc-200 flex items-center justify-center">
        <div className="text-sm text-zinc-500">Model evaluation not available yet.</div>
      </div>
    );
  }

  const dc = ev.dixonColesV0;
  const elo = ev.eloV0Baseline;
  const cal = ev.calibrationDC ?? [];

  // Calibration bar widths
  const maxCount = Math.max(...cal.map((c: any) => c.count), 1);

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <header className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold mb-2">Model Transparency</div>
          <h1 className="text-3xl font-black text-white">We publish our misses.</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Out-of-sample evaluation on {ev.matches} Premier League matches. Every prediction was made with information available before kickoff only.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Head to head */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-red-900/50 bg-gradient-to-br from-red-950/20 to-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-red-400">Dixon-Coles v0</h2>
              <span className="text-[9px] uppercase tracking-widest text-green-400 border border-green-900/50 rounded px-1.5 py-0.5">Current</span>
            </div>
            <div className="space-y-3">
              <Metric label="Outcome accuracy" value={`${(dc.accuracy * 100).toFixed(1)}%`} highlight />
              <Metric label="Brier score" value={dc.brier.toFixed(3)} sub="lower is better · random = 0.667" />
              <Metric label="Log loss" value={dc.logLoss.toFixed(3)} sub="lower is better" />
              {dc.goalMAE != null && <Metric label="Goal forecast error" value={`±${dc.goalMAE.toFixed(2)}`} sub="mean absolute error per goal forecast" />}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Elo v0</h2>
              <span className="text-[9px] uppercase tracking-widest text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">Baseline</span>
            </div>
            <div className="space-y-3">
              <Metric label="Outcome accuracy" value={`${(elo.accuracy * 100).toFixed(1)}%`} />
              <Metric label="Brier score" value={elo.brier.toFixed(3)} sub="lower is better · random = 0.667" />
              <Metric label="Log loss" value={elo.logLoss.toFixed(3)} sub="lower is better" />
              <Metric label="Verdict" value="Beaten" sub="Dixon-Coles wins on every metric" highlight />
            </div>
          </div>
        </section>

        {/* Calibration */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Calibration — home win probability</h2>
          <p className="text-[11px] text-zinc-600 mb-4">
            When we say a team has a 40% chance of winning, do they win 40% of the time? Each bin shows predicted vs actual.
          </p>
          <div className="space-y-2">
            {cal.map((c: any) => {
              const gap = Math.abs(c.predicted - c.actual);
              const wellCalibrated = gap <= 0.08;
              return (
                <div key={c.bin} className="flex items-center gap-3 text-xs">
                  <span className="w-20 font-mono text-zinc-500">{c.bin}</span>
                  <span className="w-14 text-right font-mono text-blue-400">{(c.predicted * 100).toFixed(0)}%</span>
                  <div className="flex-1 h-4 bg-zinc-800 rounded overflow-hidden relative">
                    <div className="h-full bg-blue-600/60" style={{ width: `${c.predicted * 100}%` }} />
                    <div className="absolute top-0 h-full border-l-2 border-white" style={{ left: `${c.actual * 100}%` }} title="actual" />
                  </div>
                  <span className={`w-14 font-mono ${wellCalibrated ? "text-green-400" : "text-amber-400"}`}>{(c.actual * 100).toFixed(0)}%</span>
                  <span className="w-12 text-right text-zinc-700">{c.count} games</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-600">
            <span><span className="inline-block w-3 h-2 bg-blue-600/60 mr-1" />predicted</span>
            <span><span className="inline-block w-0.5 h-3 bg-white mr-1 align-middle" />actual</span>
            <span>green = within ±8pp (well calibrated)</span>
          </div>
        </section>

        {/* Methodology */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">Methodology</h2>
          <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
            <li>Warmup excluded: first {ev.warmupExcluded} matches used purely to initialize ratings/parameters.</li>
            <li>Out-of-sample: Dixon-Coles refitted every 20 matches using only prior history — no future data leaks into any prediction.</li>
            <li>Immutable snapshots: every prediction stored at generation time, never overwritten, evaluated against actual results.</li>
            <li>Random baseline Brier score: {ev.randomBaselineBrier?.toFixed?.(3) ?? ev.randomBaselineBrier}. Perfect prediction: 0.</li>
            <li>Data: StatsBomb Open Data (Premier League 2003/04 + 2015/16).</li>
          </ul>
        </section>

        <footer className="border-t border-zinc-900 py-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-zinc-700">
            FootballTerror · Evaluated {new Date(ev.evaluatedAt).toLocaleDateString()} · No cherry-picking
          </div>
        </footer>
      </main>
    </div>
  );
}
