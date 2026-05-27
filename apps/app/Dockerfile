# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifests first — layer caches on dependency changes only
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/app/package.json apps/app/
COPY apps/landing/package.json apps/landing/

RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Build core library then app
RUN pnpm -F @de-pii/core build && pnpm -F @de-pii/app build

# ---------------------------------------------------------------------------

FROM nginx:1.27-alpine AS runtime

COPY --from=builder /repo/apps/app/build /usr/share/nginx/html
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf

# Grant ownership so nginx user can serve files
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost:8080/health || exit 1
