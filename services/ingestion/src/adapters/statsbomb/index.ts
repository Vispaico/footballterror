import crypto from 'node:crypto';
import type { FootballDataAdapter, ProviderInfo, AdapterRawResult, AdapterOptions, MatchDetail } from '../types.js';
import type { Competition, Season, Club, Player, Fixture, MatchEvent, TeamMatchStats, PlayerMatchStats, Lineup, LineupPlayer, Provenance } from '@footballterror/football-schema';

interface SBCompetition { competition_id: number; country_name: string; competition_name: string; competition_gender: string; competition_youth: boolean; competition_international: boolean; season_id: number; season_name: string; match_updated: string; match_available: string; }
interface SBMatch { match_id: number; match_date: string; kick_off: string; competition: { competition_id: number; country_name: string; name: string }; season: { season_id: number; name: string }; stage?: string; match_week: number; competition_stage?: { name: string }; home_team: { home_team_id: number; home_team_name: string; home_team_country?: { name: string; id: number } }; away_team: { away_team_id: number; away_team_name: string; away_team_country?: { name: string; id: number } }; home_score?: number; away_score?: number; score: { halftime: { home: number; away: number }; fulltime: { home: number; away: number } }; match_status?: string; last_updated: string; stadium?: string; attendance?: number; referee?: { name: string; id: number }; home_team_managers?: Array<{ name: string; id: number }>; away_team_managers?: Array<{ name: string; id: number }> }
interface SBLineupPlayer { player_id: number; player_name: string; player_nickname?: string; jersey_number: string; position: { id: number; name: string }; start: { bench: boolean; time: number }; substitute?: { out?: { time: number; player_id: number; reason?: string }; inPlayer?: { time: number; player_id: number } } }
interface SBLineup { team_id: number; team_name: string; lineup: SBLineupPlayer[] }
interface SBEvent { id: number; index: number; period: number; timestamp: string; minute: number; second: number; team: { id: number; name: string }; player: { id: number; name: string }; position: { id: number; name: string }; location: number[] | null; type: { id: number; name: string }; related_events?: number[]; shot?: { end_location: number[]; body_part: { id: number; name: string }; type: { id: number; name: string }; outcome: { id: number; name: string }; technique?: { id: number; name: string }; statsbomb_xg?: number; }; pass?: { length: number; angle: number; end_location: number[]; recipient?: { id: number; name: string }; body_part: { id: number; name: string }; type: { id: number; name: string }; outcome: { id: number; name: string }; }; carry?: { end_location: number[] }; foul_committed?: { card?: { id: number; name: string } }; bad_behaviour?: { card?: { id: number; name: string } }; }

function sbId(providerId: number): string { return `ft:statsbomb:${providerId}`; }

function makeProvenance(providerId: string | number, retrievedAt: Date, originalTimestamp?: string, rawPayload?: unknown): Provenance {
  const rawHash = rawPayload ? crypto.createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex') : undefined;
  return { provider: 'statsbomb', providerId: String(providerId), retrievedAt, originalTimestamp: originalTimestamp ? new Date(originalTimestamp) : undefined, rawPayloadHash: rawHash, normalizedVersion: '0.1.0', ingestionVersion: '0.1.0' };
}

export class StatsBombAdapter implements FootballDataAdapter {
  readonly info: ProviderInfo = { id: 'statsbomb', name: 'StatsBomb Open Data', version: '4.0.0', supportedCompetitions: [], requiresAuth: false };
  private dataDir: string;
  constructor(dataDir: string) { this.dataDir = dataDir; }

  private async readJson<T>(relativePath: string): Promise<T> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return JSON.parse(await fs.readFile(path.join(this.dataDir, relativePath), 'utf-8')) as T;
  }

  private countryNameToISO(name: string): string { const m: Record<string, string> = { England: 'GB-ENG', Scotland: 'GB-SCT', Spain: 'ES', Germany: 'DE', France: 'FR', Italy: 'IT', USA: 'US', Brazil: 'BR', Argentina: 'AR', Netherlands: 'NL', Portugal: 'PT' }; return m[name] ?? name.slice(0, 3).toUpperCase(); }
  private inferConfederation(country: string): string { const uefa = ['England', 'Scotland', 'Spain', 'Germany', 'France', 'Italy', 'Netherlands', 'Portugal']; const conmebol = ['Brazil', 'Argentina']; if (uefa.includes(country)) return 'UEFA'; if (conmebol.includes(country)) return 'CONMEBOL'; return 'OTHER'; }
  private mapPosition(sbPos: string): import('@footballterror/football-schema').PlayerPosition { const m: Record<string, import('@footballterror/football-schema').PlayerPosition> = { Goalkeeper: 'goalkeeper', 'Center Back': 'centre_back', 'Left Back': 'left_back', 'Right Back': 'right_back', 'Defensive Midfield': 'defensive_midfielder', 'Center Midfield': 'central_midfielder', 'Attacking Midfield': 'attacking_midfielder', 'Left Wing': 'left_winger', 'Right Wing': 'right_winger', 'Center Forward': 'centre_forward', Striker: 'centre_forward' }; return m[sbPos] ?? 'centre_forward'; }
  private mapEventType(sbType: string): MatchEvent['type'] { const m: Record<string, MatchEvent['type']> = { Shot: 'shot', Goal: 'goal', 'Own Goal Against': 'own_goal', Penalty: 'penalty_awarded', 'Foul Committed': 'foul', 'Foul Won': 'foul', Card: 'yellow_card', 'Substitution Off': 'substitution', 'Substitution On': 'substitution' }; return m[sbType] ?? 'shot'; }

  async listCompetitions(): Promise<AdapterRawResult<Competition>[]> {
    const raw = await this.readJson<SBCompetition[]>('data/competitions.json');
    const now = new Date();
    return raw.map(item => ({ data: { id: sbId(item.competition_id), name: item.competition_name, country: item.country_name, countryId: this.countryNameToISO(item.country_name), confederation: this.inferConfederation(item.country_name), level: 1, gender: item.competition_gender === 'male' ? 'male' : 'female', active: true, createdAt: now, updatedAt: now }, provenance: makeProvenance(item.competition_id, now, item.match_updated, item) }));
  }

  async listSeasons(providerCompetitionId: string): Promise<AdapterRawResult<Season>[]> {
    const raw = await this.readJson<SBCompetition[]>('data/competitions.json');
    const now = new Date();
    return raw.filter(item => String(item.competition_id) === providerCompetitionId).map(item => ({ data: { id: sbId(item.season_id), competitionId: sbId(item.competition_id), name: item.season_name, startDate: new Date(`${item.season_name.split('/')[0]}-08-01`), endDate: new Date(`${parseInt(item.season_name.split('/')[1])}-07-01`), active: true, createdAt: now }, provenance: makeProvenance(item.season_id, now, item.match_available, item) }));
  }

  async listClubs(providerCompetitionId: string, providerSeasonId: string): Promise<AdapterRawResult<Club>[]> {
    const matches = await this.readJson<SBMatch[]>(`data/${providerCompetitionId}/${providerSeasonId}/matches.json`);
    const now = new Date();
    const seen = new Map<number, Club>();
    for (const m of matches) {
      if (!seen.has(m.home_team.home_team_id)) seen.set(m.home_team.home_team_id, { id: sbId(m.home_team.home_team_id), name: m.home_team.home_team_name, country: m.home_team.home_team_country?.name ?? '', countryId: m.home_team.home_team_country?.id ? String(m.home_team.home_team_country.id) : '', active: true, createdAt: now, updatedAt: now });
      if (!seen.has(m.away_team.away_team_id)) seen.set(m.away_team.away_team_id, { id: sbId(m.away_team.away_team_id), name: m.away_team.away_team_name, country: m.away_team.away_team_country?.name ?? '', countryId: m.away_team.away_team_country?.id ? String(m.away_team.away_team_country.id) : '', active: true, createdAt: now, updatedAt: now });
    }
    return Array.from(seen.values()).map(club => ({ data: club, provenance: makeProvenance(club.id.replace('ft:statsbomb:', ''), now) }));
  }

  async listPlayers(providerClubId: string, providerSeasonId: string): Promise<AdapterRawResult<Player>[]> {
    // StatsBomb stores lineups at data/{competitionId}/{seasonId}/lineups.json
    // We need to find which competition directory contains this season
    const competitions = await this.readJson<SBCompetition[]>('data/competitions.json');
    const compSeasonPairs = [...new Set(competitions.map(c => `${c.competition_id}/${c.season_id}`))];
    let allLineups: SBLineup[] = [];
    for (const pair of compSeasonPairs) {
      const [compId, seasonId] = pair.split('/');
      if (seasonId !== providerSeasonId) continue;
      try {
        allLineups = await this.readJson<SBLineup[]>(`data/${compId}/${seasonId}/lineups.json`);
        break;
      } catch { continue; }
    }
    const now = new Date();
    const seen = new Map<number, Player>();
    for (const lineup of allLineups) {
      if (String(lineup.team_id) !== providerClubId) continue;
      for (const p of lineup.lineup) {
        if (!seen.has(p.player_id)) seen.set(p.player_id, { id: sbId(p.player_id), name: p.player_nickname ?? p.player_name, position: this.mapPosition(p.position.name), active: true, currentClubId: sbId(lineup.team_id), createdAt: now, updatedAt: now });
      }
    }
    return Array.from(seen.values()).map(player => ({ data: player, provenance: makeProvenance(player.id.replace('ft:statsbomb:', ''), now) }));
  }

  async listFixtures(providerCompetitionId: string, providerSeasonId: string): Promise<AdapterRawResult<Fixture>[]> {
    const matches = await this.readJson<SBMatch[]>(`data/${providerCompetitionId}/${providerSeasonId}/matches.json`);
    const now = new Date();
    return matches.map(m => ({ data: this.mapMatch(m, now), provenance: makeProvenance(m.match_id, now, m.match_date, m) }));
  }

  private mapMatch(m: SBMatch, now: Date): Fixture {
    const kickoff = m.kick_off ? new Date(`${m.match_date}T${m.kick_off}`) : new Date(m.match_date);
    const slug = `${m.home_team.home_team_name.toLowerCase().replace(/\s+/g, '-')}-vs-${m.away_team.away_team_name.toLowerCase().replace(/\s+/g, '-')}-${m.match_date}`;
    return { id: sbId(m.match_id), competitionId: sbId(m.competition.competition_id), seasonId: sbId(m.season.season_id), matchday: m.match_week, stage: m.competition_stage?.name, status: m.match_status === 'available' ? 'finished' : 'scheduled', utcKickoff: kickoff, venue: m.stadium, referee: m.referee?.name, attendance: m.attendance, homeTeamId: sbId(m.home_team.home_team_id), awayTeamId: sbId(m.away_team.away_team_id), homeScore: m.score?.fulltime?.home, awayScore: m.score?.fulltime?.away, homeScoreHalfTime: m.score?.halftime?.home, awayScoreHalfTime: m.score?.halftime?.away, slug, createdAt: now, updatedAt: now };
  }

  async getMatchDetail(providerFixtureId: string): Promise<MatchDetail | null> {
    const { competitionId, seasonId, match } = await this.findMatchParent(providerFixtureId);
    if (!match) return null;
    const base = `data/${competitionId}/${seasonId}`;
    const now = new Date();
    let events: SBEvent[] = [];
    try { events = await this.readJson<SBEvent[]>(`${base}/events.json`); } catch {}
    let lineups: SBLineup[] = [];
    try { lineups = await this.readJson<SBLineup[]>(`${base}/lineups.json`); } catch {}
    const fixture = this.mapMatch(match, now);
    return {
      fixture: { data: fixture, provenance: makeProvenance(match.match_id, now, match.match_date, match) },
      lineups: lineups.filter(l => l.team_id === match.home_team.home_team_id || l.team_id === match.away_team.away_team_id).map(l => ({ data: this.mapLineup(l, match.match_id, now), provenance: makeProvenance(l.team_id, now) })),
      teamStats: this.computeTeamStatsFromEvents(events, match, now),
      playerStats: this.computePlayerStatsFromEvents(events, match, now),
      events: events.slice(0, 1000).map((e, idx) => ({ data: this.mapEvent(e, match.match_id, idx, now), provenance: makeProvenance(e.id, now, e.timestamp) })),
    };
  }

  private async findMatchParent(providerFixtureId: string): Promise<{ competitionId: string; seasonId: string; match: SBMatch | null }> {
    const competitions = await this.readJson<SBCompetition[]>('data/competitions.json');
    const targetId = parseInt(providerFixtureId.replace('ft:statsbomb:', ''), 10);
    const pairs = new Map<string, number>();
    for (const c of competitions) pairs.set(`${c.competition_id}/${c.season_id}`, 1);
    for (const [pair] of pairs) {
      const [compId, seasonId] = pair.split('/');
      try { const matches = await this.readJson<SBMatch[]>(`data/${compId}/${seasonId}/matches.json`); const found = matches.find(m => m.match_id === targetId); if (found) return { competitionId: compId, seasonId, match: found }; } catch { continue; }
    }
    return { competitionId: '', seasonId: '', match: null };
  }

  private mapLineup(l: SBLineup, matchId: number, now: Date): { lineup: Lineup; players: LineupPlayer[] } {
    const lineup: Lineup = { id: `ft:statsbomb:lineup:${l.team_id}:${matchId}`, fixtureId: sbId(matchId), teamId: sbId(l.team_id), teamSide: 'home', confirmedAt: now, createdAt: now };
    const players: LineupPlayer[] = l.lineup.map(p => ({ id: `ft:statsbomb:lp:${p.player_id}:${matchId}`, lineupId: lineup.id, playerId: sbId(p.player_id), shirtNumber: parseInt(p.jersey_number, 10) || undefined, position: p.position.name, startX: 50, startY: 50, substitute: p.start.bench, substituteMinute: p.substitute?.inPlayer?.time, createdAt: now }));
    return { lineup, players };
  }

  private mapEvent(e: SBEvent, matchId: number, _index: number, now: Date): MatchEvent {
    return { id: `ft:statsbomb:evt:${e.id}`, fixtureId: sbId(matchId), eventId: String(e.id), minute: e.minute, second: e.second, type: this.mapEventType(e.type.name), teamSide: 'home', playerId: e.player?.id ? sbId(e.player.id) : undefined, location: e.location ? { x: e.location[0], y: e.location[1] } : undefined, outcome: e.shot?.outcome?.name ?? e.pass?.outcome?.name, createdAt: now };
  }

  private computeTeamStatsFromEvents(events: SBEvent[], match: SBMatch, now: Date): AdapterRawResult<TeamMatchStats>[] {
    const homeId = match.home_team.home_team_id;
    const awayId = match.away_team.away_team_id;
    const homeStats = this.emptyTeamStats(match.match_id, 'home', homeId, now);
    const awayStats = this.emptyTeamStats(match.match_id, 'away', awayId, now);
    for (const ev of events) {
      const isHome = ev.team?.id === homeId;
      const stats = isHome ? homeStats : awayStats;
      switch (ev.type?.name) {
        case 'Shot': stats.shots++; if (ev.shot) { if (ev.shot.outcome?.name === 'Goal') stats.goals++; if (ev.shot.statsbomb_xg != null) stats.xG += ev.shot.statsbomb_xg; if (ev.shot.outcome?.name === 'Saved' || ev.shot.outcome?.name === 'Off T') stats.shotsOnTarget++; if (ev.shot.outcome?.name === 'Blocked') stats.shotsBlocked++; if (ev.shot.outcome?.name === 'Off T' || ev.shot.outcome?.name === 'Wayward') stats.shotsOffTarget++; } break;
        case 'Pass': stats.passes++; if (ev.pass?.outcome?.name === 'Complete') stats.passAccuracy++; break;
        case 'Duel': stats.tackles++; break;
        case 'Pressure': stats.pressures++; break;
        case 'Interception': stats.interceptions++; break;
        case 'Block': stats.blocks++; break;
        case 'Clearance': stats.clearances++; break;
        case 'Foul Committed': stats.fouls++; break;
        case 'Foul Won': stats.foulsSuffered++; break;
        case 'Card': if (ev.foul_committed?.card?.name === 'Yellow Card' || ev.bad_behaviour?.card?.name === 'Yellow Card') stats.yellowCards++; if (ev.foul_committed?.card?.name === 'Red Card' || ev.bad_behaviour?.card?.name === 'Red Card') stats.redCards++; break;
      }
    }
    if (homeStats.passes > 0) homeStats.passAccuracy = Math.round((homeStats.passAccuracy / homeStats.passes) * 100 * 10) / 10;
    if (awayStats.passes > 0) awayStats.passAccuracy = Math.round((awayStats.passAccuracy / awayStats.passes) * 100 * 10) / 10;
    homeStats.goals = match.score?.fulltime?.home ?? 0;
    homeStats.goalsConceded = match.score?.fulltime?.away ?? 0;
    awayStats.goals = match.score?.fulltime?.away ?? 0;
    awayStats.goalsConceded = match.score?.fulltime?.home ?? 0;
    return [{ data: homeStats, provenance: makeProvenance(match.match_id, now) }, { data: awayStats, provenance: makeProvenance(match.match_id, now) }];
  }

  private computePlayerStatsFromEvents(events: SBEvent[], match: SBMatch, now: Date): AdapterRawResult<PlayerMatchStats>[] {
    const playerMap = new Map<string, PlayerMatchStats>();
    for (const ev of events) {
      if (!ev.player?.id) continue;
      const key = String(ev.player.id);
      if (!playerMap.has(key)) {
        const isHome = ev.team?.id === match.home_team.home_team_id;
        playerMap.set(key, { id: `ft:statsbomb:pms:${ev.player.id}:${match.match_id}`, fixtureId: sbId(match.match_id), playerId: sbId(ev.player.id), teamId: sbId(isHome ? match.home_team.home_team_id : match.away_team.away_team_id), teamSide: isHome ? 'home' : 'away', minutesPlayed: 0, starter: true, goals: 0, assists: 0, xG: 0, xA: 0, shots: 0, shotsOnTarget: 0, keyPasses: 0, passes: 0, passAccuracy: 0, progressivePasses: 0, progressiveCarries: 0, touches: 0, tackles: 0, interceptions: 0, blocks: 0, clearances: 0, pressures: 0, dribbles: 0, aerialsWon: 0, aerialsLost: 0, fouls: 0, foulsSuffered: 0, yellowCards: 0, redCards: 0, createdAt: now, updatedAt: now });
      }
      const p = playerMap.get(key)!;
      p.touches++;
      switch (ev.type?.name) {
        case 'Shot': p.shots++; if (ev.shot?.statsbomb_xg != null) p.xG += ev.shot.statsbomb_xg; if (ev.shot?.outcome?.name === 'Goal') p.goals++; if (ev.shot?.outcome?.name === 'Saved') p.shotsOnTarget++; break;
        case 'Pass': p.passes++; if (ev.pass?.recipient) { p.keyPasses++; p.assists++; } if (ev.pass?.outcome?.name === 'Complete' && ev.pass.end_location && ev.location && ev.pass.end_location[0] - ev.location[0] > 10) p.progressivePasses++; break;
        case 'Carry': if (ev.carry?.end_location && ev.location && ev.carry.end_location[0] - ev.location[0] > 10) p.progressiveCarries++; p.dribbles++; break;
        case 'Duel': p.tackles++; break;
        case 'Pressure': p.pressures++; break;
        case 'Interception': p.interceptions++; break;
        case 'Block': p.blocks++; break;
        case 'Clearance': p.clearances++; break;
        case 'Foul Committed': p.fouls++; break;
        case 'Foul Won': p.foulsSuffered++; break;
        case 'Card': if (ev.foul_committed?.card?.name === 'Yellow Card' || ev.bad_behaviour?.card?.name === 'Yellow Card') p.yellowCards++; if (ev.foul_committed?.card?.name === 'Red Card' || ev.bad_behaviour?.card?.name === 'Red Card') p.redCards++; break;
      }
    }
    for (const p of playerMap.values()) { if (p.passes > 0) p.passAccuracy = Math.round((p.passAccuracy / p.passes) * 100 * 10) / 10; }
    return Array.from(playerMap.values()).map(stats => ({ data: stats, provenance: makeProvenance(stats.playerId.replace('ft:statsbomb:', ''), now) }));
  }

  private emptyTeamStats(matchId: number, side: 'home' | 'away', teamId: number, now: Date): TeamMatchStats {
    return { id: `ft:statsbomb:tms:${teamId}:${matchId}`, fixtureId: sbId(matchId), teamSide: side, teamId: sbId(teamId), goals: 0, goalsConceded: 0, xG: 0, xGA: 0, shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, shotsBlocked: 0, possession: 50, passes: 0, passAccuracy: 0, progressivePasses: 0, progressiveCarries: 0, tackles: 0, interceptions: 0, blocks: 0, clearances: 0, pressures: 0, ppda: 0, yellowCards: 0, redCards: 0, fouls: 0, foulsSuffered: 0, corners: 0, freeKicks: 0, penaltiesAwarded: 0, boxEntries: 0, highTurnovers: 0, createdAt: now, updatedAt: now };
  }

  async getLineups(providerFixtureId: string): Promise<AdapterRawResult<{ lineup: Lineup; players: LineupPlayer[] }>[]> {
    const { competitionId, seasonId, match } = await this.findMatchParent(providerFixtureId);
    if (!match) return [];
    let lineups: SBLineup[];
    try { lineups = await this.readJson<SBLineup[]>(`data/${competitionId}/${seasonId}/lineups.json`); } catch { return []; }
    const now = new Date();
    return lineups.filter(l => l.team_id === match.home_team.home_team_id || l.team_id === match.away_team.away_team_id).map(l => ({ data: this.mapLineup(l, match.match_id, now), provenance: makeProvenance(l.team_id, now) }));
  }

  async getTeamStats(providerFixtureId: string): Promise<AdapterRawResult<TeamMatchStats>[]> {
    const { competitionId, seasonId, match } = await this.findMatchParent(providerFixtureId);
    if (!match) return [];
    let events: SBEvent[];
    try { events = await this.readJson<SBEvent[]>(`data/${competitionId}/${seasonId}/events.json`); } catch { return []; }
    return this.computeTeamStatsFromEvents(events, match, new Date());
  }

  async getPlayerStats(providerFixtureId: string): Promise<AdapterRawResult<PlayerMatchStats>[]> {
    const { competitionId, seasonId, match } = await this.findMatchParent(providerFixtureId);
    if (!match) return [];
    let events: SBEvent[];
    try { events = await this.readJson<SBEvent[]>(`data/${competitionId}/${seasonId}/events.json`); } catch { return []; }
    return this.computePlayerStatsFromEvents(events, match, new Date());
  }

  async getMatchEvents(providerFixtureId: string): Promise<AdapterRawResult<MatchEvent>[]> {
    const { competitionId, seasonId, match } = await this.findMatchParent(providerFixtureId);
    if (!match) return [];
    let events: SBEvent[];
    try { events = await this.readJson<SBEvent[]>(`data/${competitionId}/${seasonId}/events.json`); } catch { return []; }
    const now = new Date();
    return events.slice(0, 2000).map((e, idx) => ({ data: this.mapEvent(e, match.match_id, idx, now), provenance: makeProvenance(e.id, now, e.timestamp) }));
  }
}
