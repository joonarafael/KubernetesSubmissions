# Build from the repository root:
#   docker build -f ping_pong/Dockerfile -t ping-pong:1.9 .
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY --parents */package.json ./
COPY ping_pong/tsconfig.json ping_pong/tsconfig.json
COPY ping_pong/src ping_pong/src

RUN npm ci && npm run build -w ping-pong

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/ping_pong/dist ./dist

USER node

CMD ["node", "dist/index.js"]
