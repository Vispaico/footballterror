# FootballTerror — Architecture Decision Records

## ADR-001: Monorepo

**Date**: 2024-01-01
**Status**: Accepted

**Context**: FootballTerror spans multiple apps, services, and shared libraries.

**Decision**: Use a pnpm monorepo with Turborepo for build orchestration.

**Rationale**:
- Shared canonical types across all packages
- Atomic commits across the full stack
- Fast local development with workspace links
- Turborepo provides incremental builds and caching
- No versioning friction between internal packages

**Consequences**:
- All packages share the same root `node_modules`
- TypeScript project references for type checking
- CI can run full or partial builds

---

## ADR-002: SQLite for Development

**Date**: 2024-01-01
**Status**: Accepted

**Context**: Need a local database for development without requiring Docker.

**Decision**: Use SQLite (via better-sqlite3 + Drizzle ORM) for local development. Schema designed to be PostgreSQL-compatible.

**Rationale**:
- Zero configuration — just works
- Drizzle ORM supports both SQLite and PostgreSQL
- WAL mode provides good concurrency for dev
- Schema uses only portable types (text, integer, real)
- No Docker dependency for basic development

**Consequences**:
- No JSON column type in SQLite (store as TEXT)
- No array types — use JSON TEXT columns
- Production will use PostgreSQL

---

## ADR-003: Provider Abstraction

**Date**: 2024-01-01
**Status**: Accepted

**Context**: Multiple data providers with different formats.

**Decision**: Implement a `FootballDataAdapter` interface that all providers must implement. All downstream code uses canonical types only.

**Rationale**:
- Prevents vendor lock-in
- Enables swapping providers without changing analytics/agents
- Canonical types serve as the single source of truth
- Adapter contract includes provenance tracking
- Providers return raw data alongside canonical mapping

**Consequences**:
- Each new provider requires adapter implementation
- Adapter tests verify contract compliance
- Some provider-specific features may be lost in normalization

---

## ADR-004: StatsBomb Open Data First

**Date**: 2024-01-01
**Status**: Accepted

**Context**: Need a first data provider for development and testing.

**Decision**: StatsBomb Open Data is the first adapter implementation.

**Rationale**:
- Free and publicly available (no API key needed)
- Rich event data (shots, passes, pressures, etc.)
- High quality with xG values
- Well-documented JSON format
- Active community and documentation
- Covers Premier League data

**Consequences**:
- Data is historical only (not live)
- Limited competition coverage
- Event-level data requires server-side processing for large datasets

---

## ADR-005: Immutable Predictions

**Date**: 2024-01-01
**Status**: Accepted

**Context**: Predictions should not be silently modified.

**Decision**: Every prediction is a new snapshot. Historical predictions are never overwritten.

**Rationale**:
- Accountability: users can see how predictions changed
- Evaluation: can compare prediction at time T to actual result
- Trust: transparency builds user confidence
- Auditability: full prediction history is available
- Model improvement: track performance across versions

**Consequences**:
- Storage grows with each prediction version
- UI must display prediction evolution
- Evaluation pipeline must match predictions to results
