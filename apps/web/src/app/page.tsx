export default function Home() {
  return (
    <main className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white mb-2">
          FootballTerror
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          AI-native football intelligence platform
        </p>
        <div className="space-y-3">
          <a
            href="/match/liverpool-arsenal-2016-01-13"
            className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-6 py-4 hover:border-red-900 transition-colors"
          >
            <div className="text-xs text-red-500 uppercase tracking-widest mb-1">
              ⚠️ Historical Replay
            </div>
            <div className="text-lg font-bold text-white">
              Liverpool 3-3 Arsenal
            </div>
            <div className="text-xs text-zinc-500">
              Premier League 2015/2016 · MD21 · 13 Jan 2016
            </div>
          </a>
        </div>
        <div className="mt-8 text-[10px] text-zinc-700 uppercase tracking-widest">
          ONE PERFECT MATCH · Phase 7
        </div>
      </div>
    </main>
  );
}
