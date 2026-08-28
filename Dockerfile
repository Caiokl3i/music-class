# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ace build needs a valid env file present in the image context
RUN printf '%s\n' \
  'NODE_ENV=production' \
  'HOST=0.0.0.0' \
  'PORT=3333' \
  'LOG_LEVEL=info' \
  'APP_KEY=dockerbuildkeydockerbuildkeydocke' \
  'APP_URL=http://localhost:3333' \
  'SESSION_DRIVER=cookie' \
  > .env \
  && node ace build
WORKDIR /app/build
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 adonis \
  && useradd --system --uid 1001 --gid adonis adonis

COPY --from=build /app/build ./
COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/tmp \
  && chown -R adonis:adonis /app

USER adonis
EXPOSE 3333
ENTRYPOINT ["sh", "/entrypoint.sh"]
