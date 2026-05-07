# Build context: repository root (mercur/), e.g. docker build -f apps/backend/Dockerfile .
ARG HTTP_PROXY
ARG HTTPS_PROXY

FROM node:20-alpine AS base
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
RUN apk add --no-cache libc6-compat

FROM base AS builder
WORKDIR /app
RUN yarn global add turbo@2.3.3
COPY . .
RUN turbo prune api --docker

FROM base AS installer
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile || yarn install
COPY --from=builder /app/out/full/ .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN yarn turbo build --filter=api

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 medusa && adduser --system --uid 1001 medusa
RUN mkdir -p /app/apps/backend/static && chown -R medusa:medusa /app
COPY --from=installer --chown=medusa:medusa /app .
COPY --chown=medusa:medusa apps/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
USER medusa
WORKDIR /app/apps/backend
EXPOSE 9000
ENV NODE_ENV=production
ENTRYPOINT ["/docker-entrypoint.sh"]
