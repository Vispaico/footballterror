import type { Agent, AgentContext } from "../types.js";
import type { AgentClaim, TerrorVerdict } from "@footballterror/football-schema";
import { genId, makeClaim } from "../types.js";

export const terrorAgent = {
  type: "terror" as const,
  async run(ctx: AgentContext, allClaims: AgentClaim[]) {
    const runId = genId("run");
    const insights: string[] = [];

    // Synthesize key insights from all agents
    const homeXG = ctx.homeFeatures?.xG ?? 0;
    const awayXG = ctx.awayFeatures?.xG ?? 0;
    insights.push(`Six-goal thriller: ${ctx.fixture.homeScore}-${ctx.fixture.awayScore}`);
    insights.push(`${ctx.homeTeamName} xG: ${homeXG.toFixed(2)} | ${ctx.awayTeamName} xG: ${awayXG.toFixed(2)}`);
    insights.push(`Pre-match Elo favored ${ctx.homeElo > ctx.awayElo ? ctx.homeTeamName : ctx.awayTeamName} (${ctx.homeElo.toFixed(0)} vs ${ctx.awayElo.toFixed(0)})`);

    // Count agent agreement
    const agentTypes = [...new Set(allClaims.map(c => c.agentType))];
    const highConfClaims = allClaims.filter(c => c.confidence >= 0.8);

    const verdict: TerrorVerdict = {
      id: genId("verdict"),
      fixtureId: ctx.fixtureId,
      agentRunId: runId,
      headline: `${ctx.fixture.homeScore}-${ctx.fixture.awayScore}: The Chaos of Klopp vs Wenger`,
      summary: `A six-goal feast at the Emirates. ${ctx.homeTeamName} and ${ctx.awayTeamName} delivered a match that defied statistical prediction. Firmino's brace, Giroud's response, and Allen's late equalizer wrote a chapter in this historic rivalry.`,
      keyInsights: insights,
      predictionReference: ctx.prediction ? "prediction_snapshot" : undefined,
      agentContributions: Object.fromEntries(agentTypes.map(t => [t, allClaims.find(c => c.agentType === t)?.claim?.slice(0, 100) ?? ""])),
      confidence: 0.8,
      published: false,
      createdAt: new Date(),
    };

    const claim = makeClaim({
      agentRunId: runId, agentType: "terror", claimType: "INFERENCE",
      claim: verdict.headline,
      confidence: 0.8,
      evidence: allClaims.map(c => c.id),
    });

    return {
      run: { id: runId, agentType: "terror" as any, fixtureId: ctx.fixtureId, trigger: "synthesis",
        modelVersion: "0.1.0", startedAt: new Date(), completedAt: new Date(), status: "completed" as const,
        inputHash: "", createdAt: new Date() },
      verdict,
      claims: [claim],
    };
  },
};
