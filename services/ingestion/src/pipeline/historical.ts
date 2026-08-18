/**
 * Historical Ingestion Pipeline
 *
 * Orchestrates the end-to-end process of:
 * 1. Fetching data from a provider adapter
 * 2. Normalizing it to canonical schema
 * 3. Storing it in the database
 * 4. Recording provenance
 *
 * Design: Pull-based, provider-agnostic, idempotent.
 * Running the same pipeline twice with the same data produces the same results.
 */

import { createLogger } from '@footballterror/logger';
import type { FootballDataAdapter, AdapterOptions, AdapterRawResult } from '../adapters/types.js';
import { ProvenanceTracker } from '../provenance/index.js';
import { createProvenance } from '../provenance/index.js';
import type {
  Competition,
  Season,
  Club,
  Player,
  Fixture,
  MatchEvent,
  TeamMatchStats,
  PlayerMatchStats,
  Lineup,
  LineupPlayer,
  Provenance,
} from '@footballterror/football-schema';

const log = createLogger('pipeline');

// ─── Pipeline Configuration ────────────────────────────────────────────────────

export interface PipelineConfig {
  /** Skip already-ingested items (by provider ID) */
  skipExisting?: boolean;
  /** Only ingest these entity types */
  entityTypes?: string[];
  /** Dry run — report what would be fetched */
  dryRun?: boolean;
  /** Options to pass to adapter */
  adapterOptions?: AdapterOptions;
}

// ─── Pipeline Result ───────────────────────────────────────────────────────────

export interface PipelineResult {
  readonly provider: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly competitions: number;
  readonly seasons: number;
  readonly clubs: number;
  readonly players: number;
  readonly fixtures: number;
  readonly matchDetails: number;
  readonly events: number;
  readonly teamStatsRows: number;
  readonly playerStatsRows: number;
  readonly lineups: number;
  readonly errors: number;
  readonly provenance: ProvenanceTracker;
}

// ─── Ingested Data Store ───────────────────────────────────────────────────────
// In Phase 1, this is an in-memory store.
// Phase 2+ replaces with database writes.

export interface IngestedStore {
  competitions: Map<string, AdapterRawResult<Competition>>;
  seasons: Map<string, AdapterRawResult<Season>>;
  clubs: Map<string, AdapterRawResult<Club>>;
  players: Map<string, AdapterRawResult<Player>>;
  fixtures: Map<string, AdapterRawResult<Fixture>>;
  matchEvents: Map<string, AdapterRawResult<MatchEvent>[]>;
  teamStats: Map<string, AdapterRawResult<TeamMatchStats>[]>;
  playerStats: Map<string, AdapterRawResult<PlayerMatchStats>[]>;
  lineups: Map<string, AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]>;
}

export function createEmptyStore(): IngestedStore {
  return {
    competitions: new Map(),
    seasons: new Map(),
    clubs: new Map(),
    players: new Map(),
    fixtures: new Map(),
    matchEvents: new Map(),
    teamStats: new Map(),
    playerStats: new Map(),
    lineups: new Map(),
  };
}

// ─── Pipeline Functions ────────────────────────────────────────────────────────

/**
 * Ingest all competitions from a provider
 */
export async function ingestCompetitions(
  adapter: FootballDataAdapter,
  store: IngestedStore,
  tracker: ProvenanceTracker
): Promise<number> {
  log.info({ provider: adapter.info.id }, 'Ingesting competitions');
  const results = await adapter.listCompetitions();
  let count = 0;

  for (const result of results) {
    const id = result.data.id;
    if (store.competitions.has(id)) {
      log.debug({ id }, 'Competition already ingested, skipping');
      continue;
    }
    store.competitions.set(id, result);
    tracker.recordSuccess({
      provider: adapter.info.id,
      providerId: result.provenance.providerId,
      entityType: 'competition',
      internalId: id,
      rawPayloadHash: result.provenance.rawPayloadHash,
    });
    count++;
  }

  log.info({ provider: adapter.info.id, count }, 'Competitions ingested');
  return count;
}

/**
 * Ingest seasons for a competition
 */
export async function ingestSeasons(
  adapter: FootballDataAdapter,
  providerCompetitionId: string,
  store: IngestedStore,
  tracker: ProvenanceTracker
): Promise<number> {
  log.info({ provider: adapter.info.id, competitionId: providerCompetitionId }, 'Ingesting seasons');
  const results = await adapter.listSeasons(providerCompetitionId);
  let count = 0;

  for (const result of results) {
    if (store.seasons.has(result.data.id)) continue;
    store.seasons.set(result.data.id, result);
    tracker.recordSuccess({
      provider: adapter.info.id,
      providerId: result.provenance.providerId,
      entityType: 'season',
      internalId: result.data.id,
      rawPayloadHash: result.provenance.rawPayloadHash,
    });
    count++;
  }

  log.info({ count }, 'Seasons ingested');
  return count;
}

/**
 * Ingest clubs for a competition/season
 */
export async function ingestClubs(
  adapter: FootballDataAdapter,
  providerCompetitionId: string,
  providerSeasonId: string,
  store: IngestedStore,
  tracker: ProvenanceTracker
): Promise<number> {
  log.info({ competitionId: providerCompetitionId, seasonId: providerSeasonId }, 'Ingesting clubs');
  const results = await adapter.listClubs(providerCompetitionId, providerSeasonId);
  let count = 0;

  for (const result of results) {
    if (store.clubs.has(result.data.id)) continue;
    store.clubs.set(result.data.id, result);
    tracker.recordSuccess({
      provider: adapter.info.id,
      providerId: result.provenance.providerId,
      entityType: 'club',
      internalId: result.data.id,
    });
    count++;
  }

  log.info({ count }, 'Clubs ingested');
  return count;
}

/**
 * Ingest fixtures for a competition/season
 */
export async function ingestFixtures(
  adapter: FootballDataAdapter,
  providerCompetitionId: string,
  providerSeasonId: string,
  store: IngestedStore,
  tracker: ProvenanceTracker,
  options?: AdapterOptions
): Promise<number> {
  log.info({ competitionId: providerCompetitionId, seasonId: providerSeasonId }, 'Ingesting fixtures');
  const results = await adapter.listFixtures(providerCompetitionId, providerSeasonId, options);
  let count = 0;

  for (const result of results) {
    if (store.fixtures.has(result.data.id)) continue;
    store.fixtures.set(result.data.id, result);
    tracker.recordSuccess({
      provider: adapter.info.id,
      providerId: result.provenance.providerId,
      entityType: 'fixture',
      internalId: result.data.id,
    });
    count++;
  }

  log.info({ count }, 'Fixtures ingested');
  return count;
}

/**
 * Ingest detailed match data (events, stats, lineups) for a fixture
 */
export async function ingestMatchDetail(
  adapter: FootballDataAdapter,
  providerFixtureId: string,
  store: IngestedStore,
  tracker: ProvenanceTracker
): Promise<boolean> {
  log.info({ fixtureId: providerFixtureId }, 'Ingesting match detail');

  try {
    const detail = await adapter.getMatchDetail(providerFixtureId);
    if (!detail) {
      log.warn({ fixtureId: providerFixtureId }, 'No match detail found');
      tracker.recordFailure({
        provider: adapter.info.id,
        providerId: providerFixtureId,
        entityType: 'match_detail',
        error: 'Not found',
      });
      return false;
    }

    // Store lineups (spread readonly to mutable)
    store.lineups.set(providerFixtureId, detail.lineups);

    // Store team stats
    store.teamStats.set(providerFixtureId, detail.teamStats);

    // Store player stats
    store.playerStats.set(providerFixtureId, detail.playerStats);

    // Store events
    store.matchEvents.set(providerFixtureId, detail.events);

    // Record provenance for each
    for (const lineup of detail.lineups) {
      tracker.recordSuccess({
        provider: adapter.info.id,
        providerId: lineup.provenance.providerId,
        entityType: 'lineup',
        internalId: lineup.data.lineup.id,
      });
    }
    for (const stats of detail.teamStats) {
      tracker.recordSuccess({
        provider: adapter.info.id,
        providerId: stats.provenance.providerId,
        entityType: 'team_stats',
        internalId: stats.data.id,
      });
    }
    for (const stats of detail.playerStats) {
      tracker.recordSuccess({
        provider: adapter.info.id,
        providerId: stats.provenance.providerId,
        entityType: 'player_stats',
        internalId: stats.data.id,
      });
    }

    log.info(
      {
        fixtureId: providerFixtureId,
        lineups: detail.lineups.length,
        teamStats: detail.teamStats.length,
        playerStats: detail.playerStats.length,
        events: detail.events.length,
      },
      'Match detail ingested'
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error({ fixtureId: providerFixtureId, error: msg }, 'Failed to ingest match detail');
    tracker.recordFailure({
      provider: adapter.info.id,
      providerId: providerFixtureId,
      entityType: 'match_detail',
      error: msg,
    });
    return false;
  }
}

// ─── Full Historical Ingestion ─────────────────────────────────────────────────

/**
 * Run a complete historical ingestion for a provider.
 * Fetches all competitions, seasons, clubs, fixtures, and match details.
 */
export async function runHistoricalIngestion(
  adapter: FootballDataAdapter,
  config: PipelineConfig = {}
): Promise<PipelineResult> {
  const startedAt = new Date();
  const store = createEmptyStore();
  const tracker = new ProvenanceTracker();

  log.info({ provider: adapter.info.id, config }, 'Starting historical ingestion');

  // 1. Competitions
  const competitions = await ingestCompetitions(adapter, store, tracker);

  // 2. Seasons per competition
  let seasons = 0;
  for (const [compId] of store.competitions) {
    seasons += await ingestSeasons(adapter, compId, store, tracker);
  }

  // 3. Clubs per season
  let clubs = 0;
  for (const [seasonId, seasonResult] of store.seasons) {
    clubs += await ingestClubs(adapter, seasonResult.data.competitionId, seasonId, store, tracker);
  }

  // 4. Fixtures per season
  let fixtures = 0;
  for (const [seasonId, seasonResult] of store.seasons) {
    fixtures += await ingestFixtures(
      adapter,
      seasonResult.data.competitionId,
      seasonId,
      store,
      tracker,
      config.adapterOptions
    );
  }

  // 5. Match details (only for completed matches, limit for testing)
  let matchDetails = 0;
  let events = 0;
  let teamStatsRows = 0;
  let playerStatsRows = 0;
  let lineups = 0;
  let errors = 0;

  if (!config.dryRun) {
    const fixturesToDetail = Array.from(store.fixtures.values())
      .filter((f) => f.data.status === 'finished')
      .slice(0, config.adapterOptions?.dryRun ? 5 : undefined); // Limit for initial testing

    for (const fixtureResult of fixturesToDetail) {
      const success = await ingestMatchDetail(adapter, fixtureResult.provenance.providerId, store, tracker);
      if (success) {
        matchDetails++;
        const fixtureEvents = store.matchEvents.get(fixtureResult.provenance.providerId);
        const fixtureTeamStats = store.teamStats.get(fixtureResult.provenance.providerId);
        const fixturePlayerStats = store.playerStats.get(fixtureResult.provenance.providerId);
        const fixtureLineups = store.lineups.get(fixtureResult.provenance.providerId);
        if (fixtureEvents) events += fixtureEvents.length;
        if (fixtureTeamStats) teamStatsRows += fixtureTeamStats.length;
        if (fixturePlayerStats) playerStatsRows += fixturePlayerStats.length;
        if (fixtureLineups) lineups += fixtureLineups.length;
      } else {
        errors++;
      }
    }
  }

  const completedAt = new Date();
  const result: PipelineResult = {
    provider: adapter.info.id,
    startedAt,
    completedAt,
    competitions,
    seasons,
    clubs,
    players: store.players.size,
    fixtures,
    matchDetails,
    events,
    teamStatsRows,
    playerStatsRows,
    lineups,
    errors,
    provenance: tracker,
  };

  log.info(result, 'Historical ingestion complete');
  return result;
}


