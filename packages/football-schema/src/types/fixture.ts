export type MatchStatus =
  | 'scheduled'
  | 'in_play'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'awarded';

export type TeamSide = 'home' | 'away';

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_awarded'
  | 'penalty_missed'
  | 'penalty_saved'
  | 'yellow_card'
  | 'red_card'
  | 'second_yellow_card'
  | 'substitution'
  | 'shot'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'shot_blocked'
  | 'save'
  | 'foul'
  | 'corner'
  | 'free_kick'
  | 'throw_in'
  | 'offside'
  | 'VAR_decision';

export interface Fixture {
  id: string;
  competitionId: string;
  seasonId: string;
  matchday?: number;
  stage?: string;
  status: MatchStatus;
  utcKickoff: Date;
  venue?: string;
  venueCity?: string;
  weather?: { temperature?: number; conditions?: string; windSpeed?: number; humidity?: number };
  referee?: string;
  attendance?: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  homeScoreHalfTime?: number;
  awayScoreHalfTime?: number;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchEvent {
  id: string;
  fixtureId: string;
  eventId: string;
  minute: number;
  second?: number;
  addedTime?: number;
  type: MatchEventType;
  teamSide: TeamSide;
  playerId?: string;
  relatedPlayerId?: string;
  location?: { x: number; y: number };
  outcome?: string;
  description?: string;
  createdAt: Date;
}

export interface TeamMatchStats {
  id: string;
  fixtureId: string;
  teamSide: TeamSide;
  teamId: string;
  goals: number;
  goalsConceded: number;
  xG: number;
  xGA: number;
  shots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  shotsBlocked: number;
  possession: number;
  passes: number;
  passAccuracy: number;
  progressivePasses: number;
  progressiveCarries: number;
  tackles: number;
  interceptions: number;
  blocks: number;
  clearances: number;
  pressures: number;
  ppda: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  foulsSuffered: number;
  corners: number;
  freeKicks: number;
  penaltiesAwarded: number;
  boxEntries: number;
  highTurnovers: number;
  fieldTilt?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerMatchStats {
  id: string;
  fixtureId: string;
  playerId: string;
  teamId: string;
  teamSide: TeamSide;
  minutesPlayed: number;
  starter: boolean;
  position?: string;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  passes: number;
  passAccuracy: number;
  progressivePasses: number;
  progressiveCarries: number;
  touches: number;
  tackles: number;
  interceptions: number;
  blocks: number;
  clearances: number;
  pressures: number;
  dribbles: number;
  aerialsWon: number;
  aerialsLost: number;
  fouls: number;
  foulsSuffered: number;
  yellowCards: number;
  redCards: number;
  saves?: number;
  savePercentage?: number;
  penaltyGoals?: number;
  penaltyMisses?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lineup {
  id: string;
  fixtureId: string;
  teamId: string;
  teamSide: TeamSide;
  formation?: string;
  manager?: string;
  confirmedAt?: Date;
  createdAt: Date;
}

export interface LineupPlayer {
  id: string;
  lineupId: string;
  playerId: string;
  shirtNumber?: number;
  position: string;
  startX: number;
  startY: number;
  substitute: boolean;
  substituteMinute?: number;
  createdAt: Date;
}
