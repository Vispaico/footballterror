# FootballTerror API — single-stage build (reliable with full workspace lockfile)
FROM node:22-slim

# Native build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

# Full context (repo tracks data/match-output for the demo fixture)
COPY . .

RUN pnpm install --frozen-lockfile

# Build workspace dependencies first, then the API
RUN pnpm --filter @footballterror/football-schema --filter @footballterror/config \
        --filter @footballterror/logger --filter @footballterror/database build \
 && pnpm --filter @footballterror/api build

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
