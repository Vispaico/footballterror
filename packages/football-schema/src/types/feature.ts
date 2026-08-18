export type FeatureCategory =
  | 'attack' | 'defence' | 'control' | 'transition'
  | 'set_piece' | 'goalkeeping' | 'form' | 'fitness'
  | 'opponent' | 'context';

export type RollingWindow = 'last_1' | 'last_3' | 'last_5' | 'last_10' | 'last_20' | 'season' | 'all';

export interface TeamFeature {
  id: string;
  teamId: string;
  fixtureId?: string;
  seasonId: string;
  computedAt: Date;
  featureVersion: string;
  goals: number;
  goalsConceded: number;
  xG: number;
  xGA: number;
  shots: number;
  shotsConceded: number;
  shotsOnTarget: number;
  possession: number;
  fieldTilt: number;
  ppda: number;
  boxEntries: number;
  progressivePasses: number;
  progressiveCarries: number;
  highTurnovers: number;
  setPieceGoals: number;
  setPieceConceded: number;
  transitionGoals: number;
  finishingPerformance: number;
  goalkeepingPerformance: number;
  opponentStrength: number;
  homeAdvantage: number;
  restDays: number;
  fixtureCongestion: number;
  playerAvailabilityScore: number;
  window?: RollingWindow;
  windowSize?: number;
  exponentialWeight?: number;
}

export interface PlayerFeature {
  id: string;
  playerId: string;
  fixtureId?: string;
  seasonId: string;
  computedAt: Date;
  featureVersion: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  shots: number;
  shotVolume: number;
  keyPasses: number;
  progressivePasses: number;
  progressiveCarries: number;
  dribbles: number;
  tackles: number;
  interceptions: number;
  pressures: number;
  aerialsWon: number;
  fouls: number;
  foulsSuffered: number;
  yellowCards: number;
  redCards: number;
  saves?: number;
  savePercentage?: number;
  expectedMinutes?: number;
  window?: RollingWindow;
  windowSize?: number;
  exponentialWeight?: number;
}

export interface TeamForecast {
  id: string;
  teamId: string;
  metric: string;
  generatedAt: Date;
  forecastHorizon: number;
  pointForecasts: number[];
  quantileForecasts?: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[] };
  historicalValues: number[];
  model: string;
  metrics?: { mape?: number; rmse?: number; mae?: number; comparisonBaseline?: string };
}

export interface PlayerForecast {
  id: string;
  playerId: string;
  metric: string;
  generatedAt: Date;
  forecastHorizon: number;
  pointForecasts: number[];
  quantileForecasts?: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[] };
  historicalValues: number[];
  model: string;
  metrics?: { mape?: number; rmse?: number; mae?: number; comparisonBaseline?: string };
}
