# Build from the repository root:
#   docker build -f todo_backend/Dockerfile -t todo-backend:2.2 .
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY --parents */package.json ./
COPY todo_backend/tsconfig.json todo_backend/tsconfig.json
COPY todo_backend/src todo_backend/src

RUN npm ci && npm run build -w todo-backend

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/todo_backend/dist ./dist

USER node

CMD ["node", "dist/index.js"]
