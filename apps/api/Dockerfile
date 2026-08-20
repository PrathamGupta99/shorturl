# syntax=docker/dockerfile:1

# Production image for @url-shortener/api.
#
# Build from the monorepo root so the shared workspace package is available:
#   docker build -f apps/api/Dockerfile -t url-shortener-api .
#
# Run database migrations against this same image before starting the server:
#   docker run --rm --env-file .env url-shortener-api node apps/api/dist/db/migrate.js

FROM node:22-alpine AS base
WORKDIR /app

# Resolve the monorepo down to just this workspace and its dependencies
# (packages/shared), with a lockfile pruned to match, so installs are not
# tied to the full npm-workspaces tree.
FROM base AS pruner
RUN npm install -g turbo@2.10.11
COPY . .
RUN turbo prune @url-shortener/api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ ./
RUN npm ci
COPY --from=pruner /app/out/full/ ./
COPY tsconfig.base.json ./tsconfig.base.json
RUN npx turbo run build --filter=@url-shortener/api...
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV NODE_EXTRA_CA_CERTS=/app/certs/aiven-project-ca.pem
RUN addgroup -S app && adduser -S app -G app
COPY --from=installer /app ./
# Aiven's PostgreSQL and Kafka services use this public project CA.
COPY infra/certs/aiven-project-ca.pem /app/certs/aiven-project-ca.pem
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
