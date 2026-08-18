# FootballTerror — Roadmap

## Phase Overview

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Foundation, monorepo, database, CI, schemas | ✅ Complete |
| 1 | Provider abstraction and historical ingestion | ✅ Complete |
| 2 | Feature engine, Elo, Power Index v0, Terror Index v0 | 🔲 Pending |
| 3 | Poisson/Dixon-Coles match prediction and evaluation | 🔲 Pending |
| 4 | TimesFM experimentation and forecasting abstraction | 🔲 Pending |
| 5 | Initial agents: Quant, Forecaster, Gaffer, Historian, Contrarian, Terror | 🔲 Pending |
| 6 | Liverpool club intelligence | 🔲 Pending |
| 7 | One Perfect Match Match Room | 🔲 Pending |
| 8 | War Room | 🔲 Pending |
| 9 | Live-data adapter and live match state | 🔲 Pending |
| 10 | Newsroom and Verifier | 🔲 Pending |
| 11 | Broadcaster / FootballTerror Radio | 🔲 Pending |
| 12 | Accounts, follows, notifications | 🔲 Pending |
| 13 | Subscriptions | 🔲 Pending |
| 14 | Ask FootballTerror | 🔲 Pending |
| 15 | Expansion to other clubs/competitions | 🔲 Pending |

## Phase 1 — Provider Abstraction and Historical Ingestion

### What Was Built
- Provider-neutral adapter contract (`FootballDataAdapter` interface)
- StatsBomb Open Data adapter implementation
- Manual fixture adapter for testing
- Canonical domain types for all football entities
- Provenance tracking system
- Historical ingestion pipeline
- Complete database schema (Drizzle ORM, SQLite)
- Unit tests for adapter, pipeline, and provenance

### Acceptance Criteria
- [x] Adapter contract defined with all required methods
- [x] StatsBomb adapter implements the contract
- [x] Adapter converts raw StatsBomb JSON to canonical types
- [x] Provenance records provider, timestamp, hash for every object
- [x] Ingestion pipeline orchestrates fetch → normalize → store
- [x] No downstream code depends on provider-specific fields
- [x] All unit tests pass
- [x] Documentation complete

## Phase 2 — Feature Engine, Elo, Power Index v0, Terror Index v0

### Planned
- Rolling feature computation (1, 3, 5, 10, 20 match windows)
- Exponentially weighted moving averages
- Elo rating system
- Power Index v0 with sub-indices
- Terror Index v0 with components
- Feature storage in database

## Phase 3 — Poisson/Dixon-Coles Prediction

### Planned
- Dixon-Coles goal model implementation
- Score grid computation
- Prediction snapshot system
- Evaluation framework (log loss, Brier, calibration)
- Model versioning
