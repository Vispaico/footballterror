import type { Agent, AgentContext } from "../types.js";
import { genId, makeObservation, makeClaim } from "../types.js";

export const quantAgent: Agent = {
  type: "quant",
  async run(ctx) {
    const runId = genId("run");
    const observations = [];
    const claims = [];

    // Analyze xG from home features
    if (ctx.homeFeatures) {
      const xg = ctx.homeFeatures.xG;
      const shots = ctx.homeFeatures.shots;
      observations.push(makeObservation({
        agentRunId: runId, agentType: "quant", category: "xg_trend",
        evidenceType: "MODEL_OUTPUT",
        claim: `${ctx.homeTeamName} generated ${xg.toFixed(2)} xG from ${shots} shots in this match.`,
        confidence: 0.95,
        supportingData: [
          { label: "xG", value: xg, source: "statsbomb_events", unit: "xG" },
          { label: "Shots", value: shots, source: "statsbomb_events" },
        ],
        sourceReferences: ["statsbomb_events"],
      }));
    }

    if (ctx.awayFeatures) {
      const xg = ctx.awayFeatures.xG;
      const shots = ctx.awayFeatures.shots;
      observations.push(makeObservation({
        agentRunId: runId, agentType: "quant", category: "xg_trend",
        evidenceType: "MODEL_OUTPUT",
        claim: `${ctx.awayTeamName} generated ${xg.toFixed(2)} xG from ${shots} shots in this match.`,
        confidence: 0.95,
        supportingData: [
          { label: "xG", value: xg, source: "statsbomb_events", unit: "xG" },
          { label: "Shots", value: shots, source: "statsbomb_events" },
        ],
        sourceReferences: ["statsbomb_events"],
      }));
    }

    // Compare xG to actual goals
    if (ctx.homeFeatures && ctx.fixture.homeScore != null) {
      const diff = ctx.fixture.homeScore - ctx.homeFeatures.xG;
      const overperforming = diff > 0;
      observations.push(makeObservation({
        agentRunId: runId, agentType: "quant", category: "finishing",
        evidenceType: "MODEL_OUTPUT",
        claim: `${ctx.homeTeamName} ${overperforming ? "over" : "under"}performed their xG by ${Math.abs(diff).toFixed(2)} (${ctx.fixture.homeScore} goals vs ${ctx.homeFeatures.xG.toFixed(2)} xG).`,
        confidence: 0.9,
        supportingData: [
          { label: "Actual Goals", value: ctx.fixture.homeScore, source: "match_result" },
          { label: "Expected Goals", value: ctx.homeFeatures.xG, source: "statsbomb_xg" },
        ],
        sourceReferences: ["statsbomb_events", "match_result"],
      }));
    }

    // Elo-based prediction
    const homeWinProb = ctx.prediction?.homeWin ?? 0.5;
    observations.push(makeObservation({
      agentRunId: runId, agentType: "quant", category: "elo_prediction",
      evidenceType: "MODEL_OUTPUT",
      claim: `Elo model predicted ${ctx.homeTeamName} win probability at ${(homeWinProb * 100).toFixed(1)}%.`,
      confidence: 0.8,
      supportingData: [
        { label: "Home Win Probability", value: (homeWinProb * 100).toFixed(1), source: "elo_model", unit: "%" },
        { label: "Home Elo", value: ctx.homeElo, source: "elo_ratings" },
        { label: "Away Elo", value: ctx.awayElo, source: "elo_ratings" },
      ],
      sourceReferences: ["elo_model"],
    }));

    claims.push(makeClaim({
      agentRunId: runId, agentType: "quant", claimType: "MODEL_OUTPUT",
      claim: `The statistical profile of this match shows ${ctx.homeTeamName} with ${ctx.homeFeatures?.xG.toFixed(2) ?? "?"} xG vs ${ctx.awayTeamName} with ${ctx.awayFeatures?.xG.toFixed(2) ?? "?"} xG.`,
      confidence: 0.85,
      evidence: observations.map(o => o.id),
    }));

    return {
      run: { id: runId, agentType: "quant", fixtureId: ctx.fixtureId, trigger: "match_analysis",
        modelVersion: "0.1.0", startedAt: new Date(), completedAt: new Date(), status: "completed",
        inputHash: "", createdAt: new Date() },
      observations, claims,
    };
  },
};
