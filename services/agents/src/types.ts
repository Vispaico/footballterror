import type { AgentRun, AgentObservation, AgentClaim, AgentDataPoint, TerrorVerdict, AgentType, EvidenceType } from "@footballterror/football-schema";

export interface AgentContext {
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  fixture: { homeScore?: number; awayScore?: number; status: string; slug: string };
  homeFeatures: any;
  awayFeatures: any;
  homeElo: number;
  awayElo: number;
  prediction: any;
  events: any[];
  lineups: any[];
  previousAgentClaims?: AgentClaim[];
}

export interface Agent {
  type: AgentType;
  run(ctx: AgentContext): Promise<{ run: AgentRun; observations: AgentObservation[]; claims: AgentClaim[] }>;
}

let _counter = 0;
export function genId(prefix: string): string { return `ft:${prefix}:${Date.now()}:${++_counter}`; }

export function makeObservation(opts: {
  agentRunId: string; agentType: AgentType; category: string;
  evidenceType: EvidenceType; claim: string; confidence: number;
  supportingData: AgentDataPoint[]; contradictingData?: AgentDataPoint[];
  sourceReferences?: string[];
}): AgentObservation {
  return {
    id: genId("obs"), agentRunId: opts.agentRunId, agentType: opts.agentType,
    category: opts.category, evidenceType: opts.evidenceType, claim: opts.claim,
    confidence: opts.confidence, supportingData: opts.supportingData,
    contradictingData: opts.contradictingData, sourceReferences: opts.sourceReferences ?? [],
    createdAt: new Date(),
  };
}

export function makeClaim(opts: {
  agentRunId: string; agentType: AgentType; claimType: EvidenceType;
  claim: string; confidence: number; evidence: string[];
  contradictoryEvidence?: string[];
}): AgentClaim {
  return {
    id: genId("claim"), agentRunId: opts.agentRunId, agentType: opts.agentType,
    claimType: opts.claimType, claim: opts.claim, confidence: opts.confidence,
    evidence: opts.evidence, contradictoryEvidence: opts.contradictoryEvidence,
    published: false, createdAt: new Date(),
  };
}
