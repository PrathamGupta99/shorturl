# syntax=docker/dockerfile:1

# Production image for @url-shortener/analytics-worker.
#
# Build from the monorepo root so the shared workspace package is available:
#   docker build -f apps/analytics-worker/Dockerfile -t url-shortener-worker .

FROM node:22-alpine AS base
WORKDIR /app

# Resolve the monorepo down to just this workspace and its dependencies
# (packages/shared), with a lockfile pruned to match, so installs are not
# tied to the full npm-workspaces tree.
FROM base AS pruner
RUN npm install -g turbo@2.10.11
COPY . .
RUN turbo prune @url-shortener/analytics-worker --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ ./
RUN npm ci
COPY --from=pruner /app/out/full/ ./
COPY tsconfig.base.json ./tsconfig.base.json
RUN npx turbo run build --filter=@url-shortener/analytics-worker...
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=installer /app ./
USER app
CMD ["node", "apps/analytics-worker/dist/index.js"]
