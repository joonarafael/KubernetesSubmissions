# Build from the repository root:
#   docker build -f log_output/Dockerfile -t log-output:2.1 .
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY --parents */package.json ./
COPY log_output/tsconfig.json log_output/tsconfig.json
COPY log_output/src log_output/src

RUN npm ci && npm run build -w log-output

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/log_output/dist ./dist

USER node

CMD ["node", "dist/reader.js"]
