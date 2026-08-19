FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/football-schema/package.json packages/football-schema/
COPY packages/config/package.json packages/config/
COPY packages/logger/package.json packages/logger/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/*/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @footballterror/football-schema build
RUN pnpm --filter @footballterror/config build
RUN pnpm --filter @footballterror/logger build
RUN pnpm --filter @footballterror/database build
RUN pnpm --filter @footballterror/api build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/football-schema/dist ./packages/football-schema/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
