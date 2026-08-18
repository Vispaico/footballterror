export type AgentType =
  | 'quant' | 'forecaster' | 'gaffer' | 'historian' | 'contrarian'
  | 'terror' | 'scout' | 'newsroom' | 'verifier' | 'kop' | 'broadcaster' | 'publisher';

export type EvidenceType = 'FACT' | 'MODEL_OUTPUT' | 'FORECAST' | 'INFERENCE' | 'OPINION' | 'UNKNOWN';

export interface AgentRun {
  id: string;
  agentType: AgentType;
  fixtureId?: string;
  teamId?: string;
  playerId?: string;
  trigger: string;
  modelVersion: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  inputHash: string;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd?: number; model: string; provider: string };
  error?: string;
  createdAt: Date;
}

export interface AgentObservation {
  id: string;
  agentRunId: string;
  agentType: AgentType;
  category: string;
  evidenceType: EvidenceType;
  claim: string;
  confidence: number;
  supportingData: AgentDataPoint[];
  contradictingData?: AgentDataPoint[];
  sourceReferences: string[];
  createdAt: Date;
}

export interface AgentDataPoint {
  label: string;
  value: number | string;
  unit?: string;
  source: string;
  context?: string;
}

export interface AgentClaim {
  id: string;
  agentRunId: string;
  observationId?: string;
  agentType: AgentType;
  claimType: EvidenceType;
  claim: string;
  confidence: number;
  evidence: string[];
  contradictoryEvidence?: string[];
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
}

export interface TerrorVerdict {
  id: string;
  fixtureId: string;
  agentRunId: string;
  headline: string;
  summary: string;
  keyInsights: string[];
  predictionReference?: string;
  powerIndexReference?: string;
  terrorIndexReference?: string;
  agentContributions: Record<string, string>;
  confidence: number;
  published: boolean;
  createdAt: Date;
}
