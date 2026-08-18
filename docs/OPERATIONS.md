# FootballTerror — Operations Guide

## Local Development

### Prerequisites
- Node.js 22+
- pnpm 11+
- Python 3.11+ (for future ML work)

### Setup
```bash
# Clone and install
git clone https://github.com/Vispaico/footballterror.git
cd footballterror
pnpm install

# Copy environment
cp .env.example .env

# Build all packages
pnpm build
```

### Running
```bash
# Development (all apps)
pnpm dev

# API only
pnpm --filter @footballterror/api dev

# Web only
pnpm --filter @footballterror/web dev
```

### Testing
```bash
# All tests
pnpm test

# Specific package
pnpm --filter @footballterror/ingestion test

# With coverage
pnpm --filter @footballterror/ingestion test -- --coverage
```

## Data Ingestion

### StatsBomb Open Data
```bash
# Clone StatsBomb data
git clone https://github.com/statsbomb/open-data.git ./data/statsbomb

# Run ingestion (Phase 1)
pnpm --filter @footballterror/ingestion ingest
```

## Database

### Generate Migrations
```bash
pnpm db:generate
```

### Run Migrations
```bash
pnpm db:migrate
```

### Schema Location
All table definitions: `packages/database/src/schema/`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:./data/footballterror.db` |
| `REDIS_URL` | Redis connection (optional) | — |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |
| `PORT` | API port | `3001` |
| `AUTO_PUBLISH_ENABLED` | Enable auto-publishing | `false` |

## Logging

All services use structured logging via `@footballterror/logger` (pino).
- Development: pretty-printed with colors
- Production: JSON format
- Do NOT log secrets, API keys, or credentials

## CI/CD

GitHub Actions workflow for:
- TypeScript compilation check
- Vitest test suite
- Lint checks
- Build verification

## Monitoring

Phase 1 tracks:
- Ingestion runs (count, errors)
- Provenance records
- Pipeline execution time

Phase 2+ adds:
- Model prediction accuracy
- Agent token consumption
- API latency
