export const metadata = {
  title: "FootballTerror — AI-Native Football Intelligence",
  description: "Autonomous football intelligence platform. Predictions, Power Index, Terror Index, and AI agent analysis for every match.",
  openGraph: {
    title: "FootballTerror — AI-Native Football Intelligence",
    description: "Autonomous football intelligence platform. Predictions, Power Index, Terror Index, and AI agent analysis.",
    url: "https://footballterror.com",
    siteName: "FootballTerror",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 overflow-hidden">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            AI-Native Football Intelligence
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6">
            <span className="text-white">Football</span>
            <span className="text-red-500">Terror</span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Autonomous intelligence platform that <span className="text-white font-semibold">observes</span>,{" "}
            <span className="text-white font-semibold">analyzes</span>, and{" "}
            <span className="text-white font-semibold">explains</span> every match through proprietary AI agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="/war-room" className="group relative inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-lg transition-all duration-300 hover:shadow-[0_0_40px_rgba(220,38,38,0.3)]">
              Enter the War Room
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </a>
            <a href="#how-it-works" className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium px-8 py-4 rounded-lg transition-colors">
              How it works
            </a>
          </div>

          {/* Live stats bar */}
          <div className="flex items-center justify-center gap-8 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-red-500" />
              <span>Power Index</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              <span>Terror Index</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-blue-500" />
              <span>Predictions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-purple-500" />
              <span>AI Agents</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-5 h-8 rounded-full border-2 border-zinc-700 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-zinc-500 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Intelligence, not <span className="text-zinc-600">headlines</span>
            </h2>
            <p className="text-lg text-zinc-500 max-w-xl mx-auto">
              FootballTerror processes structured data through proprietary models and AI agents to produce intelligence you can act on.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Power Index */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-red-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Power Index</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Auditable team strength ranking from 0–100. Built from attack, defence, control, transition, form, and momentum sub-indices. Every component inspectable.
              </p>
            </div>

            {/* Terror Index */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-amber-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Terror Index</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Measures match significance from 0–100. Rivalry, stakes, scoring intensity, prediction uncertainty. From DORMANT to TOTAL WAR.
              </p>
            </div>

            {/* Predictions */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-blue-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Match Predictions</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Elo + Dixon-Coles models with full probability grids. Every prediction is immutable, versioned, and evaluated against actual results.
              </p>
            </div>

            {/* AI Agents */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-purple-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Agent Analysis</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Five specialist agents — Quant, Gaffer, Historian, Contrarian, The Terror — each producing structured, evidence-backed claims.
              </p>
            </div>

            {/* Provenance */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-green-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Full Provenance</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Every data point traces back to its source. Every prediction is immutable. Every agent claim cites its evidence. Nothing is fabricated.
              </p>
            </div>

            {/* Open Source Data */}
            <div className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-cyan-900/50 transition-all duration-500 hover:bg-zinc-900/50">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.34 8.374" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Open Architecture</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Provider-neutral adapters. Pluggable models. Extensible agents. Built on StatsBomb Open Data with support for multiple providers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              The intelligence <span className="text-red-500">loop</span>
            </h2>
            <p className="text-lg text-zinc-500 max-w-xl mx-auto">
              Every match goes through the same autonomous pipeline. No human intervention required.
            </p>
          </div>

          <div className="space-y-1">
            {[
              { step: "01", title: "Observe", desc: "Ingest data from multiple providers through neutral adapters", color: "text-zinc-400" },
              { step: "02", title: "Normalize", desc: "Convert provider-specific formats to canonical schema", color: "text-zinc-400" },
              { step: "03", title: "Analyze", desc: "Compute features, rolling windows, and statistical profiles", color: "text-blue-400" },
              { step: "04", title: "Forecast", desc: "Run Elo, Dixon-Coles, and time-series models", color: "text-blue-400" },
              { step: "05", title: "Predict", desc: "Generate probability distributions with uncertainty", color: "text-purple-400" },
              { step: "06", title: "Explain", desc: "Five AI agents produce structured, evidence-backed analysis", color: "text-purple-400" },
              { step: "07", title: "Publish", desc: "Deliver intelligence through Match Room and War Room", color: "text-red-400" },
              { step: "08", title: "Evaluate", desc: "Track prediction accuracy and agent performance over time", color: "text-red-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-6 py-4 border-b border-zinc-900/50 group hover:bg-zinc-900/20 transition-colors px-4 -mx-4 rounded-lg">
                <span className={`text-xs font-mono ${item.color} w-8`}>{item.step}</span>
                <span className="text-lg font-bold text-white w-32">{item.title}</span>
                <span className="text-sm text-zinc-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE DEMO ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              See it in <span className="text-red-500">action</span>
            </h2>
            <p className="text-lg text-zinc-500 max-w-xl mx-auto">
              Liverpool 3-3 Arsenal — a six-goal thriller processed through the complete FootballTerror pipeline.
            </p>
          </div>

          <a href="/match/liverpool-arsenal-2016-01-13" className="group block relative rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden hover:border-red-900/50 transition-all duration-500">
            {/* Preview card */}
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Historical Replay</span>
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-3xl font-bold text-white">Liverpool</div>
                  <div className="text-sm text-zinc-500">Anfield</div>
                </div>
                <div className="text-5xl font-black text-white tabular-nums">3 - 3</div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">Arsenal</div>
                  <div className="text-sm text-zinc-500">Premier League</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">51.2%</div>
                  <div className="text-[10px] text-zinc-600 uppercase">LIV Win</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-500">6.3%</div>
                  <div className="text-[10px] text-zinc-600 uppercase">Draw</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">42.5%</div>
                  <div className="text-[10px] text-zinc-600 uppercase">ARS Win</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Terror Index: 41.3 — WATCHABLE</span>
                <span>5 AI Agents Analyzed</span>
                <span className="text-red-500 group-hover:text-red-400 font-bold">Open Match Room →</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ─── API ────────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Build with the <span className="text-blue-500">API</span>
          </h2>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-12">
            Access predictions, Power Index, Terror Index, and agent analysis programmatically.
          </p>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left font-mono text-sm">
            <div className="text-zinc-600 mb-2"># Get match prediction</div>
            <div className="text-zinc-300">curl <span className="text-green-400">https://api.footballterror.com</span>/api/match/liverpool-arsenal-2016-01-13</div>
            <div className="mt-4 text-zinc-600 mb-2"># List all fixtures</div>
            <div className="text-zinc-300">curl <span className="text-green-400">https://api.footballterror.com</span>/api/fixtures</div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">Football<span className="text-red-500">Terror</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <a href="/war-room" className="hover:text-white transition-colors">War Room</a>
            <a href="/match/liverpool-arsenal-2016-01-13" className="hover:text-white transition-colors">Match Room</a>
            <a href="https://api.footballterror.com/api/models/performance" className="hover:text-white transition-colors">Model Performance</a>
            <a href="https://github.com/Vispaico/footballterror" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <div className="text-xs text-zinc-700">
            © 2026 FootballTerror
          </div>
        </div>
      </footer>
    </div>
  );
}
