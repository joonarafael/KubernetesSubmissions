# Build from the repository root:
#   docker build -f the_project/Dockerfile -t todo-app:1.5 .
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY --parents */package.json ./
COPY the_project/tsconfig.json the_project/tsconfig.json
COPY the_project/src the_project/src

RUN npm ci && npm run build -w todo-app

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/the_project/dist ./dist

USER node

CMD ["node", "dist/index.js"]
