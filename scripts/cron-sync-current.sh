#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/logs

# Load key from .env
export $(grep -E '^(FOOTBALL_CHARTS_KEY|FOOTBALL_CHARTS_BASE_URL)=' .env | xargs)

node_modules/.bin/tsx scripts/sync-football-charts.ts >> data/logs/sync.log 2>&1
