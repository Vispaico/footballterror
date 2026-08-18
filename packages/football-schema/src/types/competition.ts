export interface Competition {
  id: string;
  name: string;
  country: string;
  countryId: string;
  league?: string;
  confederation: string;
  level: number;
  gender: 'male' | 'female' | 'mixed';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Season {
  id: string;
  competitionId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  currentMatchday?: number;
  createdAt: Date;
}

export interface CompetitionSeason {
  competitionId: string;
  seasonId: string;
  provider?: string;
}
