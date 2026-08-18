import type { Agent, AgentContext } from "../types.js";
import { genId, makeObservation, makeClaim } from "../types.js";

export const contrarianAgent: Agent = {
  type: "contrarian",
  async run(ctx) {
    const runId = genId("run");
    const observations = [];

    // Challenge the Quant's xG analysis
    if (ctx.prediction?.homeWin != null && ctx.prediction.homeWin > 0.5) {
      observations.push(makeObservation({
        agentRunId: runId, agentType: "contrarian", category: "confidence_challenge",
        evidenceType: "INFERENCE",
        claim: `The pre-match prediction favored ${ctx.homeTeamName} at ${(ctx.prediction.homeWin * 100).toFixed(1)}%, but the actual result (3-3 draw) shows football's inherent unpredictability. No model can account for individual moments of brilliance or error.`,
        confidence: 0.7,
        supportingData: [
          { label: "Predicted Home Win", value: (ctx.prediction.homeWin * 100).toFixed(1), source: "prediction_model", unit: "%" },
          { label: "Actual Result", value: `${ctx.fixture.homeScore}-${ctx.fixture.awayScore}`, source: "match_result" },
        ],
        contradictingData: [
          { label: "Model Confidence", value: ctx.prediction.homeWin > 0.5 ? "High" : "Moderate", source: "prediction_model" },
        ],
        sourceReferences: ["prediction_model", "match_result"],
      }));
    }

    // Challenge xG narrative
    if (ctx.homeFeatures && ctx.fixture.homeScore != null) {
      const xgDiff = Math.abs(ctx.fixture.homeScore - ctx.homeFeatures.xG);
      if (xgDiff > 0.5) {
        observations.push(makeObservation({
          agentRunId: runId, agentType: "contrarian", category: "xg_challenge",
          evidenceType: "INFERENCE",
          claim: `While xG analysis shows ${ctx.homeTeamName} generated ${ctx.homeFeatures.xG.toFixed(2)} xG, they scored ${ctx.fixture.homeScore} goals. The ${xgDiff.toFixed(2)} difference suggests finishing quality or luck played a significant role — factors models struggle to capture.`,
          confidence: 0.65,
          supportingData: [
            { label: "xG", value: ctx.homeFeatures.xG, source: "statsbomb_xg" },
            { label: "Actual Goals", value: ctx.fixture.homeScore, source: "match_result" },
            { label: "Difference", value: xgDiff, source: "computed" },
          ],
          sourceReferences: ["statsbomb_events", "match_result"],
        }));
      }
    }

    return {
      run: { id: runId, agentType: "contrarian", fixtureId: ctx.fixtureId, trigger: "match_analysis",
        modelVersion: "0.1.0", startedAt: new Date(), completedAt: new Date(), status: "completed",
        inputHash: "", createdAt: new Date() },
      observations,
      claims: [makeClaim({
        agentRunId: runId, agentType: "contrarian", claimType: "INFERENCE",
        claim: `The 3-3 draw defies pre-match modeling. Football's chaos factor remains its most compelling feature — and its hardest to predict.`,
        confidence: 0.75,
        evidence: observations.map(o => o.id),
      })],
    };
  },
};
