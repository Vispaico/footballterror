import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { timestamps } from './utils.js';
import { clubs, players, fixtures, seasons } from './match.js';

// ─── Team Features ─────────────────────────────────────────────────────────────
export const teamFeatures = sqliteTable('team_features', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => clubs.id),
  fixtureId: text('fixture_id').references(() => fixtures.id),
  seasonId: text('season_id').notNull().references(() => seasons.id),
  featureVersion: text('feature_version').notNull(),
  // Core features
  goals: real('goals').notNull().default(0),
  goalsConceded: real('goals_conceded').notNull().default(0),
  xG: real('xg').notNull().default(0),
  xGA: real('xga').notNull().default(0),
  shots: real('shots').notNull().default(0),
  shotsConceded: real('shots_conceded').notNull().default(0),
  shotsOnTarget: real('shots_on_target').notNull().default(0),
  possession: real('possession').notNull().default(50),
  fieldTilt: real('field_tilt').notNull().default(50),
  ppda: real('ppda').notNull().default(10),
  boxEntries: real('box_entries').notNull().default(0),
  progressivePasses: real('progressive_passes').notNull().default(0),
  progressiveCarries: real('progressive_carries').notNull().default(0),
  highTurnovers: real('high_turnovers').notNull().default(0),
  setPieceGoals: real('set_piece_goals').notNull().default(0),
  setPieceConceded: real('set_piece_conceded').notNull().default(0),
  transitionGoals: real('transition_goals').notNull().default(0),
  finishingPerformance: real('finishing_performance').notNull().default(0),
  goalkeepingPerformance: real('goalkeeping_performance').notNull().default(0),
  opponentStrength: real('opponent_strength').notNull().default(50),
  homeAdvantage: integer('home_advantage', { mode: 'boolean' }).notNull().default(false),
  restDays: integer('rest_days').notNull().default(7),
  fixtureCongestion: integer('fixture_congestion').notNull().default(1),
  playerAvailabilityScore: real('player_availability_score').notNull().default(1),
  // Rolling window
  window: text('window'),
  windowSize: integer('window_size'),
  exponentialWeight: real('exponential_weight'),
  ...timestamps,
});

// ─── Player Features ───────────────────────────────────────────────────────────
export const playerFeatures = sqliteTable('player_features', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  fixtureId: text('fixture_id').references(() => fixtures.id),
  seasonId: text('season_id').notNull().references(() => seasons.id),
  featureVersion: text('feature_version').notNull(),
  minutesPlayed: real('minutes_played').notNull().default(0),
  goals: real('goals').notNull().default(0),
  assists: real('assists').notNull().default(0),
  xG: real('xg').notNull().default(0),
  xA: real('xa').notNull().default(0),
  shots: real('shots').notNull().default(0),
  shotVolume: real('shot_volume').notNull().default(0),
  keyPasses: real('key_passes').notNull().default(0),
  progressivePasses: real('progressive_passes').notNull().default(0),
  progressiveCarries: real('progressive_carries').notNull().default(0),
  dribbles: real('dribbles').notNull().default(0),
  tackles: real('tackles').notNull().default(0),
  interceptions: real('interceptions').notNull().default(0),
  pressures: real('pressures').notNull().default(0),
  aerialsWon: real('aerials_won').notNull().default(0),
  fouls: real('fouls').notNull().default(0),
  foulsSuffered: real('fouls_suffered').notNull().default(0),
  yellowCards: real('yellow_cards').notNull().default(0),
  redCards: real('red_cards').notNull().default(0),
  saves: real('saves'),
  savePercentage: real('save_percentage'),
  expectedMinutes: real('expected_minutes'),
  window: text('window'),
  windowSize: integer('window_size'),
  exponentialWeight: real('exponential_weight'),
  ...timestamps,
});

// ─── Team Forecasts ────────────────────────────────────────────────────────────
export const teamForecasts = sqliteTable('team_forecasts', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => clubs.id),
  metric: text('metric').notNull(),
  forecastHorizon: integer('forecast_horizon').notNull(),
  pointForecasts: text('point_forecasts').notNull(), // JSON array
  quantileForecasts: text('quantile_forecasts'), // JSON
  historicalValues: text('historical_values').notNull(), // JSON array
  model: text('model').notNull(),
  mape: real('mape'),
  rmse: real('rmse'),
  mae: real('mae'),
  comparisonBaseline: text('comparison_baseline'),
  ...timestamps,
});

// ─── Player Forecasts ──────────────────────────────────────────────────────────
export const playerForecasts = sqliteTable('player_forecasts', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  metric: text('metric').notNull(),
  forecastHorizon: integer('forecast_horizon').notNull(),
  pointForecasts: text('point_forecasts').notNull(),
  quantileForecasts: text('quantile_forecasts'),
  historicalValues: text('historical_values').notNull(),
  model: text('model').notNull(),
  mape: real('mape'),
  rmse: real('rmse'),
  mae: real('mae'),
  comparisonBaseline: text('comparison_baseline'),
  ...timestamps,
});
