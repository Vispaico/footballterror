import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { timestamps } from './utils.js';
import { clubs, fixtures, seasons } from './match.js';

// ─── Match Predictions ─────────────────────────────────────────────────────────
export const matchPredictions = sqliteTable('match_predictions', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  modelVersion: text('model_version').notNull(),
  featureVersion: text('feature_version').notNull(),
  informationCutoff: text('information_cutoff').notNull(),
  // Core probabilities
  homeWinProbability: real('home_win_probability').notNull(),
  drawProbability: real('draw_probability').notNull(),
  awayWinProbability: real('away_win_probability').notNull(),
  // Goal predictions
  expectedHomeGoals: real('expected_home_goals').notNull(),
  expectedAwayGoals: real('expected_away_goals').notNull(),
  expectedTotalGoals: real('expected_total_goals').notNull(),
  // Score grid (JSON)
  scoreProbabilities: text('score_probabilities'), // JSON: [{homeGoals, awayGoals, probability}]
  // Uncertainty
  confidence: real('confidence').notNull(),
  entropy: real('entropy').notNull(),
  inputHash: text('input_hash').notNull(),
  inputReferences: text('input_references'), // JSON array of feature IDs
  // Actual result (post-match)
  actualHomeGoals: integer('actual_home_goals'),
  actualAwayGoals: integer('actual_away_goals'),
  actualOutcome: text('actual_outcome', { enum: ['home_win', 'draw', 'away_win'] }),
  // Evaluation (post-match)
  outcomeCorrect: integer('outcome_correct', { mode: 'boolean' }),
  outcomeLogLoss: real('outcome_log_loss'),
  brierScore: real('brier_score'),
  homeGoalError: real('home_goal_error'),
  awayGoalError: real('away_goal_error'),
  evaluatedAt: text('evaluated_at'),
  ...timestamps,
});

// ─── Power Index ───────────────────────────────────────────────────────────────
export const powerIndexSnapshots = sqliteTable('power_index_snapshots', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => clubs.id),
  seasonId: text('season_id').notNull().references(() => seasons.id),
  totalScore: real('total_score').notNull(),
  // Sub-indices (JSON map)
  components: text('components').notNull(), // JSON: {attack, defence, control, ...}
  direction: text('direction', { enum: ['rising', 'falling', 'stable'] }).notNull(),
  changeFromPrevious: real('change_from_previous').notNull().default(0),
  modelVersion: text('model_version').notNull(),
  explanationInputs: text('explanation_inputs'), // JSON map
  computedAt: text('computed_at').notNull(),
  ...timestamps,
});

// ─── Terror Index ──────────────────────────────────────────────────────────────
export const terrorIndexSnapshots = sqliteTable('terror_index_snapshots', {
  id: text('id').primaryKey(),
  fixtureId: text('fixture_id').notNull().references(() => fixtures.id),
  totalScore: real('total_score').notNull(),
  level: text('level').notNull(), // dormant, watchable, heated, dangerous, terror, total_war
  components: text('components').notNull(), // JSON map
  modelVersion: text('model_version').notNull(),
  computedAt: text('computed_at').notNull(),
  ...timestamps,
});

// ─── Agent Runs ────────────────────────────────────────────────────────────────
export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  agentType: text('agent_type').notNull(),
  fixtureId: text('fixture_id').references(() => fixtures.id),
  teamId: text('team_id').references(() => clubs.id),
  playerId: text('player_id'),
  trigger: text('trigger').notNull(),
  modelVersion: text('model_version').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'timeout'] }).notNull().default('pending'),
  inputHash: text('input_hash').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  costUsd: real('cost_usd'),
  llmModel: text('llm_model'),
  llmProvider: text('llm_provider'),
  error: text('error'),
  ...timestamps,
});

// ─── Agent Observations ────────────────────────────────────────────────────────
export const agentObservations = sqliteTable('agent_observations', {
  id: text('id').primaryKey(),
  agentRunId: text('agent_run_id').notNull().references(() => agentRuns.id),
  agentType: text('agent_type').notNull(),
  category: text('category').notNull(),
  evidenceType: text('evidence_type').notNull(), // FACT, MODEL_OUTPUT, FORECAST, INFERENCE, OPINION, UNKNOWN
  claim: text('claim').notNull(),
  confidence: real('confidence').notNull(),
  supportingData: text('supporting_data'), // JSON array
  contradictingData: text('contradicting_data'), // JSON array
  sourceReferences: text('source_references'), // JSON array
  ...timestamps,
});

// ─── Agent Claims ──────────────────────────────────────────────────────────────
export const agentClaims = sqliteTable('agent_claims', {
  id: text('id').primaryKey(),
  agentRunId: text('agent_run_id').notNull().references(() => agentRuns.id),
  observationId: text('observation_id').references(() => agentObservations.id),
  agentType: text('agent_type').notNull(),
  claimType: text('claim_type').notNull(),
  claim: text('claim').notNull(),
  confidence: real('confidence').notNull(),
  evidence: text('evidence'), // JSON array of observation IDs
  contradictoryEvidence: text('contradictory_evidence'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  publishedAt: text('published_at'),
  ...timestamps,
});

// ─── Model Versions ────────────────────────────────────────────────────────────
export const modelVersions = sqliteTable('model_versions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  type: text('type').notNull(), // elo, poisson, ensemble, etc.
  config: text('config'), // JSON — model configuration
  metrics: text('metrics'), // JSON — evaluation metrics
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
});

// ─── Prediction Evaluations (summary) ─────────────────────────────────────────
export const predictionEvaluations = sqliteTable('prediction_evaluations', {
  id: text('id').primaryKey(),
  modelVersion: text('model_version').notNull(),
  totalPredictions: integer('total_predictions').notNull(),
  resultAccuracy: real('result_accuracy'),
  meanBrierScore: real('mean_brier_score'),
  meanLogLoss: real('mean_log_loss'),
  calibrationData: text('calibration_data'), // JSON
  highConfidenceRecord: text('high_confidence_record'), // JSON: {total, correct}
  bestCalls: text('best_calls'), // JSON array
  biggestMisses: text('biggest_misses'), // JSON array
  evaluatedAt: text('evaluated_at').notNull(),
  ...timestamps,
});
