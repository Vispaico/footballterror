/**
 * StatsBomb Adapter Tests
 *
 * Tests the adapter against fixed test fixtures.
 * Does not require network access or StatsBomb data directory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatsBombAdapter } from '../../src/adapters/statsbomb/index.ts';
import {
  SB_COMPETITIONS_RAW,
  SB_MATCHES_RAW,
  SB_LINEUPS_RAW,
  SB_EVENTS_RAW,
} from '../fixtures/statsbomb.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// ─── Test Setup ────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `ft-test-${Date.now()}`);
  await fs.mkdir(path.join(tmpDir, 'data', '11', '42'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'data', '11', '43'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'data', '43', '146'), { recursive: true });

  // Write competitions
  await fs.writeFile(
    path.join(tmpDir, 'data', 'competitions.json'),
    JSON.stringify(SB_COMPETITIONS_RAW)
  );

  // Write matches for PL 2023/24
  await fs.writeFile(
    path.join(tmpDir, 'data', '11', '42', 'matches.json'),
    JSON.stringify(SB_MATCHES_RAW)
  );

  // Write lineups
  await fs.writeFile(
    path.join(tmpDir, 'data', '11', '42', 'lineups.json'),
    JSON.stringify(SB_LINEUPS_RAW)
  );

  // Write events
  await fs.writeFile(
    path.join(tmpDir, 'data', '11', '42', 'events.json'),
    JSON.stringify(SB_EVENTS_RAW)
  );
});

// ─── Competitions ──────────────────────────────────────────────────────────────

describe('StatsBombAdapter', () => {
  describe('listCompetitions', () => {
    it('should return competitions from raw data', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const competitions = await adapter.listCompetitions();

      expect(competitions.length).toBeGreaterThan(0);

      const pl = competitions.find((c) => c.data.name === 'Premier League');
      expect(pl).toBeDefined();
      expect(pl!.data.country).toBe('England');
      expect(pl!.data.confederation).toBe('UEFA');
    });

    it('should generate deterministic IDs', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const c1 = await adapter.listCompetitions();
      const c2 = await adapter.listCompetitions();

      // Same data should produce same IDs
      expect(c1[0].data.id).toBe(c2[0].data.id);
    });

    it('should include provenance', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const competitions = await adapter.listCompetitions();

      const pl = competitions.find((c) => c.data.name === 'Premier League');
      expect(pl!.provenance.provider).toBe('statsbomb');
      expect(pl!.provenance.providerId).toBeTruthy();
      expect(pl!.provenance.retrievedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Seasons ────────────────────────────────────────────────────────────

  describe('listSeasons', () => {
    it('should return seasons for a competition', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const seasons = await adapter.listSeasons('11');

      expect(seasons.length).toBe(2);
      const names = seasons.map((s) => s.data.name);
      expect(names).toContain('2023/24');
      expect(names).toContain('2022/23');
    });

    it('should link seasons to parent competition', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const seasons = await adapter.listSeasons('11');

      for (const season of seasons) {
        expect(season.data.competitionId).toBe('ft:statsbomb:11');
      }
    });
  });

  // ─── Clubs ──────────────────────────────────────────────────────────────

  describe('listClubs', () => {
    it('should extract unique clubs from matches', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const clubs = await adapter.listClubs('11', '42');

      // Arsenal, Liverpool, Manchester United
      expect(clubs.length).toBe(3);

      const liverpool = clubs.find((c) => c.data.name === 'Liverpool');
      expect(liverpool).toBeDefined();
      expect(liverpool!.data.id).toBe('ft:statsbomb:14');
    });

    it('should deduplicate clubs across matches', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const clubs = await adapter.listClubs('11', '42');

      // Liverpool appears in both matches but should be deduplicated
      const liverpoolClubs = clubs.filter((c) => c.data.name === 'Liverpool');
      expect(liverpoolClubs.length).toBe(1);
    });
  });

  // ─── Fixtures ───────────────────────────────────────────────────────────

  describe('listFixtures', () => {
    it('should return fixtures with canonical schema', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const fixtures = await adapter.listFixtures('11', '42');

      expect(fixtures.length).toBe(2);

      const arsLiv = fixtures.find(
        (f) => f.data.slug.includes('arsenal') && f.data.slug.includes('liverpool')
      );
      expect(arsLiv).toBeDefined();
      expect(arsLiv!.data.homeScore).toBe(2);
      expect(arsLiv!.data.awayScore).toBe(1);
      expect(arsLiv!.data.status).toBe('finished');
      expect(arsLiv!.data.attendance).toBe(60310);
    });

    it('should generate slug from team names', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const fixtures = await adapter.listFixtures('11', '42');

      for (const f of fixtures) {
        expect(f.data.slug).toMatch(/-vs-/);
        expect(f.data.slug).toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });
  });

  // ─── Players ────────────────────────────────────────────────────────────

  describe('listPlayers', () => {
    it('should extract players from lineups', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const players = await adapter.listPlayers('1', '42');

      // Arsenal has 11 players in the lineup
      expect(players.length).toBe(11);

      const saka = players.find((p) => p.data.name === 'Bukayo Saka');
      expect(saka).toBeDefined();
      expect(saka!.data.position).toBe('right_winger');
    });
  });

  // ─── Match Detail ───────────────────────────────────────────────────────

  describe('getMatchDetail', () => {
    it('should return full match detail with events', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const detail = await adapter.getMatchDetail('3879635');

      expect(detail).not.toBeNull();
      expect(detail!.fixture.data.homeScore).toBe(2);
      expect(detail!.lineups.length).toBe(2);
      expect(detail!.events.length).toBeGreaterThan(0);
      expect(detail!.teamStats.length).toBe(2);
    });

    it('should compute xG from events', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const detail = await adapter.getMatchDetail('3879635');

      // Arsenal shots: 0.35 + 0.55 = 0.90 xG (2 goals from open play)
      // Liverpool shots: 0.45 + 0.20 = 0.65 xG (1 goal from open play)
      const homeStats = detail!.teamStats.find((s) => s.data.teamSide === 'home');
      const awayStats = detail!.teamStats.find((s) => s.data.teamSide === 'away');

      expect(homeStats!.data.xG).toBeCloseTo(0.90, 1);
      expect(awayStats!.data.xG).toBeCloseTo(0.65, 1);
    });

    it('should count shots correctly', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const detail = await adapter.getMatchDetail('3879635');

      const homeStats = detail!.teamStats.find((s) => s.data.teamSide === 'home');
      const awayStats = detail!.teamStats.find((s) => s.data.teamSide === 'away');

      // Arsenal: 2 shots (Saka x2)
      expect(homeStats!.data.shots).toBe(2);
      // Liverpool: 2 shots (Salah x2)
      expect(awayStats!.data.shots).toBe(2);
    });

    it('should track player-level stats', async () => {
      const adapter = new StatsBombAdapter(tmpDir);
      const detail = await adapter.getMatchDetail('3879635');

      const salah = detail!.playerStats.find(
        (p) => p.data.playerId === 'ft:statsbomb:8209'
      );
      expect(salah).toBeDefined();
      expect(salah!.data.xG).toBeCloseTo(0.65, 1);
      expect(salah!.data.goals).toBe(1);
      expect(salah!.data.shots).toBe(2);
    });
  });
});
