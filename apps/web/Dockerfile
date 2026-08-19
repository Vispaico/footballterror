FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/football-schema/package.json packages/football-schema/
COPY packages/config/package.json packages/config/
COPY packages/logger/package.json packages/logger/
COPY packages/database/package.json packages/database/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/football-schema/node_modules ./packages/football-schema/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN pnpm --filter @footballterror/football-schema build
RUN pnpm --filter @footballterror/config build
RUN pnpm --filter @footballterror/logger build
RUN pnpm --filter @footballterror/web build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/data ./data
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
