FROM node:20-alpine AS base
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
# turbo prune فقط درخت وابسته را می‌آورد؛ `_tsconfig.base.json` ریشه را نه — برای
# packages/modules/*/tsconfig.json که به ../../../_tsconfig.base.json ارجاع می‌دهند لازم است.
COPY --from=builder /app/_tsconfig.base.json ./_tsconfig.base.json
ENV NODE_OPTIONS=--max-old-space-size=4096
# medusa-config.ts هنگام `medusa build` اجرا می‌شود. مقادیر زیر فقط برای همین دستور در shell
# ست می‌شوند (در لایهٔ ایمیج به‌صورت ENV باقی نمی‌مانند — برای Dockle/Hadolint و امنیت).
# کانفیگ واقعی فقط در زمان اجرا از compose `.env` می‌آید.
RUN DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/medusa_build_placeholder" \
    STORE_CORS="http://localhost:3000" \
    ADMIN_CORS="http://localhost:9000" \
    VENDOR_CORS="http://localhost:5173" \
    AUTH_CORS="http://localhost:3000,http://localhost:9000,http://localhost:5173" \
    yarn turbo build --filter=api

# Runtime config only: pass secrets and DATABASE_URL via env / env_file (docker-compose), not build args.
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
