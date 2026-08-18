// FootballTerror canonical type exports

export * from './types/competition.js';
export * from './types/club.js';
export * from './types/player.js';
export * from './types/fixture.js';
export * from './types/feature.js';
export * from './types/prediction.js';
export * from './types/agent.js';
export * from './types/provenance.js';

// Utility types
export type ID = string;

export interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export interface Versioned {
  readonly version: string;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}
