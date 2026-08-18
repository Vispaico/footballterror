/**
 * Manual Fixture Adapter
 *
 * For entering fixtures/matches manually when no API data is available.
 * Useful for testing and for data not covered by automated providers.
 */

import type {
  FootballDataAdapter,
  ProviderInfo,
  AdapterRawResult,
  AdapterOptions,
  MatchDetail,
} from '../types.js';
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

export class ManualFixtureAdapter implements FootballDataAdapter {
  readonly info: ProviderInfo = {
    id: 'manual',
    name: 'Manual Entry',
    version: '0.1.0',
    supportedCompetitions: [],
    requiresAuth: false,
  };

  private fixtures = new Map<string, Fixture>();
  private teamStats = new Map<string, TeamMatchStats[]>();
  private playerStats = new Map<string, PlayerMatchStats[]>();
  private events = new Map<string, MatchEvent[]>();
  private lineups = new Map<string, { lineup: Lineup; players: LineupPlayer[] }[]>();

  addFixture(fixture: Fixture): void {
    this.fixtures.set(fixture.id, fixture);
  }

  addTeamStats(fixtureId: string, stats: TeamMatchStats[]): void {
    this.teamStats.set(fixtureId, stats);
  }

  addPlayerStats(fixtureId: string, stats: PlayerMatchStats[]): void {
    this.playerStats.set(fixtureId, stats);
  }

  addEvents(fixtureId: string, events: MatchEvent[]): void {
    this.events.set(fixtureId, events);
  }

  async listCompetitions(): Promise<AdapterRawResult<Competition>[]> {
    return [];
  }

  async listSeasons(_providerCompetitionId: string): Promise<AdapterRawResult<Season>[]> {
    return [];
  }

  async listClubs(): Promise<AdapterRawResult<Club>[]> {
    return [];
  }

  async listPlayers(): Promise<AdapterRawResult<Player>[]> {
    return [];
  }

  async listFixtures(): Promise<AdapterRawResult<Fixture>[]> {
    const now = new Date();
    return Array.from(this.fixtures.values()).map((f) => ({
      data: f,
      provenance: {
        provider: 'manual',
        providerId: f.id,
        retrievedAt: now,
        normalizedVersion: '0.1.0',
        ingestionVersion: '0.1.0',
      },
    }));
  }

  async getMatchDetail(providerFixtureId: string): Promise<MatchDetail | null> {
    const fixture = this.fixtures.get(providerFixtureId);
    if (!fixture) return null;

    const now = new Date();
    return {
      fixture: {
        data: fixture,
        provenance: { provider: 'manual', providerId: fixture.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
      },
      lineups: (this.lineups.get(providerFixtureId) ?? []).map((l) => ({
        data: l,
        provenance: { provider: 'manual', providerId: l.lineup.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
      })),
      teamStats: (this.teamStats.get(providerFixtureId) ?? []).map((s) => ({
        data: s,
        provenance: { provider: 'manual', providerId: s.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
      })),
      playerStats: (this.playerStats.get(providerFixtureId) ?? []).map((s) => ({
        data: s,
        provenance: { provider: 'manual', providerId: s.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
      })),
      events: (this.events.get(providerFixtureId) ?? []).map((e) => ({
        data: e,
        provenance: { provider: 'manual', providerId: e.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
      })),
    };
  }

  async getLineups(providerFixtureId: string): Promise<AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]> {
    const now = new Date();
    return (this.lineups.get(providerFixtureId) ?? []).map((l) => ({
      data: l,
      provenance: { provider: 'manual', providerId: l.lineup.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
    }));
  }

  async getTeamStats(providerFixtureId: string): Promise<AdapterRawResult<TeamMatchStats>[]> {
    const now = new Date();
    return (this.teamStats.get(providerFixtureId) ?? []).map((s) => ({
      data: s,
      provenance: { provider: 'manual', providerId: s.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
    }));
  }

  async getPlayerStats(providerFixtureId: string): Promise<AdapterRawResult<PlayerMatchStats>[]> {
    const now = new Date();
    return (this.playerStats.get(providerFixtureId) ?? []).map((s) => ({
      data: s,
      provenance: { provider: 'manual', providerId: s.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
    }));
  }

  async getMatchEvents(providerFixtureId: string): Promise<AdapterRawResult<MatchEvent>[]> {
    const now = new Date();
    return (this.events.get(providerFixtureId) ?? []).map((e) => ({
      data: e,
      provenance: { provider: 'manual', providerId: e.id, retrievedAt: now, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' },
    }));
  }
}
