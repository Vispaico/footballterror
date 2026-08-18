/**
 * Pipeline Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runHistoricalIngestion,
  createEmptyStore,
} from '../src/pipeline/historical.ts';
import { ProvenanceTracker } from '../src/provenance/index.ts';
import { ManualFixtureAdapter } from '../src/adapters/manual/index.ts';
import type { Fixture, TeamMatchStats, PlayerMatchStats, MatchEvent } from '@footballterror/football-schema';

// ─── Manual Adapter Tests ──────────────────────────────────────────────────────

describe('ManualFixtureAdapter', () => {
  it('should store and retrieve fixtures', async () => {
    const adapter = new ManualFixtureAdapter();
    const fixture: Fixture = {
      id: 'ft:manual:test-1',
      competitionId: 'ft:manual:comp-1',
      seasonId: 'ft:manual:season-1',
      matchday: 1,
      status: 'finished',
      utcKickoff: new Date('2024-01-01T15:00:00Z'),
      homeTeamId: 'ft:manual:club-1',
      awayTeamId: 'ft:manual:club-2',
      homeScore: 2,
      awayScore: 1,
      slug: 'club-1-vs-club-2-2024-01-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    adapter.addFixture(fixture);
    const fixtures = await adapter.listFixtures();

    expect(fixtures.length).toBe(1);
    expect(fixtures[0].data.id).toBe('ft:manual:test-1');
    expect(fixtures[0].provenance.provider).toBe('manual');
  });

  it('should return match detail', async () => {
    const adapter = new ManualFixtureAdapter();
    const fixture: Fixture = {
      id: 'ft:manual:match-1',
      competitionId: 'ft:manual:comp-1',
      seasonId: 'ft:manual:season-1',
      status: 'finished',
      utcKickoff: new Date(),
      homeTeamId: 'ft:manual:home',
      awayTeamId: 'ft:manual:away',
      homeScore: 3,
      awayScore: 2,
      slug: 'home-vs-away-2024',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    adapter.addFixture(fixture);

    const detail = await adapter.getMatchDetail('ft:manual:match-1');
    expect(detail).not.toBeNull();
    expect(detail!.fixture.data.homeScore).toBe(3);
  });
});

// ─── IngestedStore Tests ───────────────────────────────────────────────────────

describe('IngestedStore', () => {
  it('should initialize empty', () => {
    const store = createEmptyStore();
    expect(store.competitions.size).toBe(0);
    expect(store.seasons.size).toBe(0);
    expect(store.clubs.size).toBe(0);
    expect(store.fixtures.size).toBe(0);
  });
});

// ─── Historical Pipeline Tests ─────────────────────────────────────────────────

describe('runHistoricalIngestion', () => {
  it('should run dry run without fetching match details', async () => {
    const adapter = new ManualFixtureAdapter();
    adapter.addFixture({
      id: 'ft:manual:1',
      competitionId: 'ft:manual:comp',
      seasonId: 'ft:manual:season',
      status: 'finished',
      utcKickoff: new Date(),
      homeTeamId: 'ft:manual:home',
      awayTeamId: 'ft:manual:away',
      slug: 'home-vs-away',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await runHistoricalIngestion(adapter, { dryRun: true });

    expect(result.provider).toBe('manual');
    expect(result.errors).toBe(0);
    expect(result.matchDetails).toBe(0);
  });

  it('should return a result with all counters', async () => {
    const adapter = new ManualFixtureAdapter();

    const result = await runHistoricalIngestion(adapter);

    expect(result.provider).toBe('manual');
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.competitions).toBe(0); // Manual adapter returns empty
    expect(result.seasons).toBe(0);
    expect(result.clubs).toBe(0);
    expect(result.fixtures).toBe(0);
    expect(result.errors).toBe(0);
  });
});
