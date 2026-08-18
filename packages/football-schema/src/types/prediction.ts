export type MatchOutcome = 'home_win' | 'draw' | 'away_win';

export interface ScoreProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface MatchPrediction {
  id: string;
  fixtureId: string;
  generatedAt: Date;
  informationCutoff: Date;
  modelVersion: string;
  featureVersion: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  expectedTotalGoals: number;
  scoreProbabilities?: ScoreProbability[];
  confidence: number;
  entropy: number;
  inputHash: string;
  inputReferences: string[];
  actualHomeGoals?: number;
  actualAwayGoals?: number;
  actualOutcome?: MatchOutcome;
  evaluation?: PredictionEvaluation;
  createdAt: Date;
}

export interface PredictionEvaluation {
  evaluatedAt: Date;
  outcomeCorrect: boolean;
  outcomeLogLoss: number;
  brierScore: number;
  homeGoalError: number;
  awayGoalError: number;
  calibrationBin?: string;
}

export type PowerIndexSubIndex =
  | 'attack' | 'defence' | 'control' | 'transition'
  | 'form' | 'squad' | 'momentum' | 'forecast';

export interface PowerIndexSnapshot {
  id: string;
  teamId: string;
  seasonId: string;
  totalScore: number;
  components: Record<string, number>;
  direction: 'rising' | 'falling' | 'stable';
  changeFromPrevious: number;
  modelVersion: string;
  explanationInputs: Record<string, number>;
  computedAt: Date;
  createdAt: Date;
}

export type TerrorLevel = 'dormant' | 'watchable' | 'heated' | 'dangerous' | 'terror' | 'total_war';

export interface TerrorIndexSnapshot {
  id: string;
  fixtureId: string;
  totalScore: number;
  level: TerrorLevel;
  components: Record<string, number>;
  modelVersion: string;
  computedAt: Date;
  createdAt: Date;
}

export function terrorLevel(score: number): TerrorLevel {
  if (score >= 96) return 'total_war';
  if (score >= 85) return 'terror';
  if (score >= 70) return 'dangerous';
  if (score >= 50) return 'heated';
  if (score >= 30) return 'watchable';
  return 'dormant';
}
