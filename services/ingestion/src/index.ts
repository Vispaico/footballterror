export { runHistoricalIngestion, createEmptyStore } from './pipeline/historical.js';
export type { PipelineConfig, PipelineResult, IngestedStore } from './pipeline/historical.js';
export { ProvenanceTracker, createProvenance, hashPayload } from './provenance/index.js';
export { StatsBombAdapter } from './adapters/statsbomb/index.js';
export { ManualFixtureAdapter } from './adapters/manual/index.js';
export type { FootballDataAdapter, AdapterOptions, AdapterRawResult, ProviderInfo, MatchDetail } from './adapters/types.js';
