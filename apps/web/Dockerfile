# FootballTerror Web — single-stage build
FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @footballterror/web build

ENV NODE_ENV=production
ENV PORT=3000
# Baked-in demo data (tracked in git); API fetch takes priority when reachable
ENV MATCH_DATA_DIR=/app/data/match-output
EXPOSE 3000

CMD ["sh", "-c", "cd apps/web && npx next start -p ${PORT:-3000}"]
