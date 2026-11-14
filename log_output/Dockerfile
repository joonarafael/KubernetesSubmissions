FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm ci && npm run build

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]
