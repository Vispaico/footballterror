/**
 * FootballDataAdapter — Provider-neutral contract
 *
 * Every data provider adapter must implement this interface.
 * No downstream code should depend on provider-specific fields.
 * All adapter outputs map to FootballTerror's canonical schema types.
 *
 * Design decision: We use a pull-based adapter model. Each adapter
 * provides methods to list available data and fetch it. The pipeline
 * orchestrates the order and frequency.
 */

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
} from '@footballterror/football-schema';
import type { Provenance } from '@footballterror/football-schema';

// ─── Raw Provider Data ─────────────────────────────────────────────────────────
// Adapters return raw data in their own format alongside provenance.
// The normalizer then converts to canonical types.

export interface AdapterRawResult<T> {
  readonly data: T;
  readonly provenance: Provenance;
}

// ─── Provider Metadata ─────────────────────────────────────────────────────────

export interface ProviderInfo {
  readonly id: string; // e.g. "statsbomb", "football-data-org"
  readonly name: string;
  readonly version: string;
  readonly supportedCompetitions: readonly AdapterCompetition[];
  readonly requiresAuth: boolean;
  readonly rateLimit?: { requests: number; windowMs: number };
}

export interface AdapterCompetition {
  readonly providerId: string;
  readonly name: string;
  readonly country: string;
}

// ─── Adapter Options ───────────────────────────────────────────────────────────

export interface AdapterOptions {
  /** Only fetch competitions matching these provider IDs */
  competitionIds?: string[];
  /** Only fetch seasons matching these provider IDs */
  seasonIds?: string[];
  /** Only fetch fixtures from this date (ISO 8601) */
  from?: string;
  /** Only fetch fixtures up to this date (ISO 8601) */
  to?: string;
  /** Dry run — return what would be fetched without fetching */
  dryRun?: boolean;
}

// ─── The Adapter Contract ──────────────────────────────────────────────────────

export interface FootballDataAdapter {
  /** Provider metadata */
  readonly info: ProviderInfo;

  /**
   * List all competitions available from this provider.
   */
  listCompetitions(): Promise<AdapterRawResult<Competition>[]>;

  /**
   * List seasons for a given provider competition ID.
   */
  listSeasons(
    providerCompetitionId: string
  ): Promise<AdapterRawResult<Season>[]>;

  /**
   * List clubs participating in a given provider season.
   */
  listClubs(
    providerCompetitionId: string,
    providerSeasonId: string
  ): Promise<AdapterRawResult<Club>[]>;

  /**
   * List players for a given provider club in a season.
   * May not be available from all providers — return empty array.
   */
  listPlayers(
    providerClubId: string,
    providerSeasonId: string
  ): Promise<AdapterRawResult<Player>[]>;

  /**
   * List fixtures/matches for a given provider season.
   */
  listFixtures(
    providerCompetitionId: string,
    providerSeasonId: string,
    options?: AdapterOptions
  ): Promise<AdapterRawResult<Fixture>[]>;

  /**
   * Get detailed match data: events, stats, lineups for a fixture.
   */
  getMatchDetail(
    providerFixtureId: string
  ): Promise<MatchDetail | null>;

  /**
   * Get lineups for a fixture.
   * May be separate from match detail depending on provider.
   */
  getLineups(
    providerFixtureId: string
  ): Promise<AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]>;

  /**
   * Get team-level match statistics for a fixture.
   */
  getTeamStats(
    providerFixtureId: string
  ): Promise<AdapterRawResult<TeamMatchStats>[]>;

  /**
   * Get player-level match statistics for a fixture.
   */
  getPlayerStats(
    providerFixtureId: string
  ): Promise<AdapterRawResult<PlayerMatchStats>[]>;

  /**
   * Get raw match events for a fixture.
   */
  getMatchEvents(
    providerFixtureId: string
  ): Promise<AdapterRawResult<MatchEvent>[]>;
}

// ─── Match Detail ──────────────────────────────────────────────────────────────

export interface MatchDetail {
  readonly fixture: AdapterRawResult<Fixture>;
  lineups: AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[];
  teamStats: AdapterRawResult<TeamMatchStats>[];
  playerStats: AdapterRawResult<PlayerMatchStats>[];
  events: AdapterRawResult<MatchEvent>[];
}

// ─── Adapter Registry ──────────────────────────────────────────────────────────

const registry = new Map<string, FootballDataAdapter>();

export function registerAdapter(adapter: FootballDataAdapter): void {
  registry.set(adapter.info.id, adapter);
}

export function getAdapter(id: string): FootballDataAdapter | undefined {
  return registry.get(id);
}

export function listAdapters(): readonly FootballDataAdapter[] {
  return Array.from(registry.values());
}
