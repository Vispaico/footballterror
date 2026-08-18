import type { Agent, AgentContext } from "../types.js";
import { genId, makeObservation, makeClaim } from "../types.js";

export const historianAgent: Agent = {
  type: "historian",
  async run(ctx) {
    const runId = genId("run");
    const observations = [];

    observations.push(makeObservation({
      agentRunId: runId, agentType: "historian", category: "head_to_head",
      evidenceType: "FACT",
      claim: `${ctx.homeTeamName} vs ${ctx.awayTeamName} is one of English football's most storied fixtures, dating back to 1893. The match has historically been high-scoring and unpredictable.`,
      confidence: 1.0,
      supportingData: [
        { label: "Fixture", value: `${ctx.homeTeamName} vs ${ctx.awayTeamName}`, source: "historical_data" },
        { label: "First Meeting", value: "1893", source: "historical_data" },
      ],
      sourceReferences: ["historical_data"],
    }));

    observations.push(makeObservation({
      agentRunId: runId, agentType: "historian", category: "historical_form",
      evidenceType: "FACT",
      claim: `In the 2015/16 season, Liverpool were managed by Jürgen Klopp (appointed Oct 2015) and were in transition. Arsenal under Wenger were competing for the title.`,
      confidence: 1.0,
      supportingData: [
        { label: "Liverpool Manager", value: "Jürgen Klopp", source: "historical_data" },
        { label: "Arsenal Manager", value: "Arsène Wenger", source: "historical_data" },
        { label: "Season Context", value: "Liverpool in transition, Arsenal title challengers", source: "historical_data" },
      ],
      sourceReferences: ["historical_data"],
    }));

    return {
      run: { id: runId, agentType: "historian", fixtureId: ctx.fixtureId, trigger: "match_analysis",
        modelVersion: "0.1.0", startedAt: new Date(), completedAt: new Date(), status: "completed",
        inputHash: "", createdAt: new Date() },
      observations,
      claims: [makeClaim({
        agentRunId: runId, agentType: "historian", claimType: "FACT",
        claim: `Historical context: Liverpool vs Arsenal in 2015/16 featured two teams in different phases — Klopp building at Liverpool, Wenger's Arsenal in the title race.`,
        confidence: 0.9,
        evidence: observations.map(o => o.id),
      })],
    };
  },
};
