import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { timestamps } from './utils.js';

// ─── Competitions ──────────────────────────────────────────────────────────────
export const competitions = sqliteTable('competitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  countryId: text('country_id').notNull(),
  league: text('league'),
  confederation: text('confederation').notNull(),
  level: integer('level').notNull().default(1),
  gender: text('gender', { enum: ['male', 'female', 'mixed'] }).notNull().default('male'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const seasons = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(), // ISO 8601
  endDate: text('end_date').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  currentMatchday: integer('current_matchday'),
  ...timestamps,
});

// ─── Clubs ─────────────────────────────────────────────────────────────────────
export const clubs = sqliteTable('clubs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  country: text('country').notNull(),
  countryId: text('country_id').notNull(),
  city: text('city'),
  founded: integer('founded'),
  venue: text('venue'),
  crestUrl: text('crest_url'),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const clubAliases = sqliteTable('club_aliases', {
  id: text('id').primaryKey(),
  clubId: text('club_id').notNull().references(() => clubs.id),
  alias: text('alias').notNull(),
  source: text('source').notNull(),
});

// ─── Players ───────────────────────────────────────────────────────────────────
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  name: text('name').notNull(),
  dateOfBirth: text('date_of_birth'), // ISO 8601
  nationality: text('nationality'),
  secondaryNationality: text('secondary_nationality'),
  position: text('position'),
  subPosition: text('sub_position'),
  height: integer('height'), // cm
  weight: integer('weight'), // kg
  foot: text('foot', { enum: ['left', 'right', 'both'] }),
  currentClubId: text('current_club_id').references(() => clubs.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

export const playerAliases = sqliteTable('player_aliases', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  alias: text('alias').notNull(),
  source: text('source').notNull(),
});

// ─── Fixtures ──────────────────────────────────────────────────────────────────
export const fixtures = sqliteTable('fixtures', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  seasonId: text('season_id').notNull().references(() => seasons.id),
  matchday: integer('matchday'),
  stage: text('stage'),
  status: text('status', {
    enum: ['scheduled', 'in_play', 'halftime', 'finished', 'postponed', 'cancelled', 'awarded'],
  }).notNull().default('scheduled'),
  utcKickoff: text('utc_kickoff').notNull(),
  venue: text('venue'),
  venueCity: text('venue_city'),
  referee: text('referee'),
  attendance: integer('attendance'),
  homeTeamId: text('home_team_id').notNull().references(() => clubs.id),
  awayTeamId: text('away_team_id').notNull().references(() => clubs.id),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  homeScoreHalfTime: integer('home_score_half_time'),
  awayScoreHalfTime: integer('away_score_half_time'),
  slug: text('slug').notNull().unique(),
  ...timestamps,
});

// ─── Lineups ───────────────────────────────────────────────────────────────────
export const lineups = sqliteTable('lineups', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  teamId: text('team_id').notNull().references(() => clubs.id),
  teamSide: text('team_side', { enum: ['home', 'away'] }).notNull(),
  formation: text('formation'),
  manager: text('manager'),
  confirmedAt: text('confirmed_at'),
  ...timestamps,
});

export const lineupPlayers = sqliteTable('lineup_players', {
  id: text('id').primaryKey(),
  lineupId: text('lineup_id').notNull().references(() => lineups.id),
  playerId: text('player_id').notNull().references(() => players.id),
  shirtNumber: integer('shirt_number'),
  position: text('position').notNull(),
  startX: real('start_x'),
  startY: real('start_y'),
  substitute: integer('substitute', { mode: 'boolean' }).notNull().default(false),
  substituteMinute: integer('substitute_minute'),
  ...timestamps,
});

// ─── Match Events ──────────────────────────────────────────────────────────────
export const matchEvents = sqliteTable('match_events', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  eventId: text('event_id').notNull(), // provider's event ID
  minute: integer('minute').notNull(),
  second: integer('second'),
  addedTime: integer('added_time'),
  type: text('type').notNull(),
  teamSide: text('team_side', { enum: ['home', 'away'] }).notNull(),
  playerId: text('player_id').references(() => players.id),
  relatedPlayerId: text('related_player_id').references(() => players.id),
  locationX: real('location_x'),
  locationY: real('location_y'),
  outcome: text('outcome'),
  description: text('description'),
  ...timestamps,
});

// ─── Team Match Stats ─────────────────────────────────────────────────────────
export const teamMatchStats = sqliteTable('team_match_stats', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  teamSide: text('team_side', { enum: ['home', 'away'] }).notNull(),
  teamId: text('team_id').notNull().references(() => clubs.id),
  // Core
  goals: integer('goals').notNull().default(0),
  goalsConceded: integer('goals_conceded').notNull().default(0),
  xG: real('xg').notNull().default(0),
  xGA: real('xga').notNull().default(0),
  // Shooting
  shots: integer('shots').notNull().default(0),
  shotsOnTarget: integer('shots_on_target').notNull().default(0),
  shotsOffTarget: integer('shots_off_target').notNull().default(0),
  shotsBlocked: integer('shots_blocked').notNull().default(0),
  // Possession & passing
  possession: real('possession').notNull().default(50),
  passes: integer('passes').notNull().default(0),
  passAccuracy: real('pass_accuracy').notNull().default(0),
  progressivePasses: integer('progressive_passes').notNull().default(0),
  progressiveCarries: integer('progressive_carries').notNull().default(0),
  // Defensive
  tackles: integer('tackles').notNull().default(0),
  interceptions: integer('interceptions').notNull().default(0),
  blocks: integer('blocks').notNull().default(0),
  clearances: integer('clearances').notNull().default(0),
  pressures: integer('pressures').notNull().default(0),
  ppda: real('ppda').notNull().default(0),
  // Discipline
  yellowCards: integer('yellow_cards').notNull().default(0),
  redCards: integer('red_cards').notNull().default(0),
  fouls: integer('fouls').notNull().default(0),
  foulsSuffered: integer('fouls_suffered').notNull().default(0),
  // Set pieces
  corners: integer('corners').notNull().default(0),
  freeKicks: integer('free_kicks').notNull().default(0),
  penaltiesAwarded: integer('penalties_awarded').notNull().default(0),
  // Advanced
  boxEntries: integer('box_entries').notNull().default(0),
  highTurnovers: integer('high_turnovers').notNull().default(0),
  fieldTilt: real('field_tilt'),
  ...timestamps,
});

// ─── Player Match Stats ────────────────────────────────────────────────────────
export const playerMatchStats = sqliteTable('player_match_stats', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  playerId: text('player_id').notNull().references(() => players.id),
  teamId: text('team_id').notNull().references(() => clubs.id),
  teamSide: text('team_side', { enum: ['home', 'away'] }).notNull(),
  minutesPlayed: integer('minutes_played').notNull().default(0),
  starter: integer('starter', { mode: 'boolean' }).notNull().default(true),
  position: text('position'),
  goals: integer('goals').notNull().default(0),
  assists: integer('assists').notNull().default(0),
  xG: real('xg').notNull().default(0),
  xA: real('xa').notNull().default(0),
  shots: integer('shots').notNull().default(0),
  shotsOnTarget: integer('shots_on_target').notNull().default(0),
  keyPasses: integer('key_passes').notNull().default(0),
  passes: integer('passes').notNull().default(0),
  passAccuracy: real('pass_accuracy').notNull().default(0),
  progressivePasses: integer('progressive_passes').notNull().default(0),
  progressiveCarries: integer('progressive_carries').notNull().default(0),
  touches: integer('touches').notNull().default(0),
  tackles: integer('tackles').notNull().default(0),
  interceptions: integer('interceptions').notNull().default(0),
  blocks: integer('blocks').notNull().default(0),
  clearances: integer('clearances').notNull().default(0),
  pressures: integer('pressures').notNull().default(0),
  dribbles: integer('dribbles').notNull().default(0),
  aerialsWon: integer('aerials_won').notNull().default(0),
  aerialsLost: integer('aerials_lost').notNull().default(0),
  fouls: integer('fouls').notNull().default(0),
  foulsSuffered: integer('fouls_suffered').notNull().default(0),
  yellowCards: integer('yellow_cards').notNull().default(0),
  redCards: integer('red_cards').notNull().default(0),
  saves: integer('saves'),
  savePercentage: real('save_percentage'),
  penaltyGoals: integer('penalty_goals'),
  penaltyMisses: integer('penalty_misses'),
  ...timestamps,
});
