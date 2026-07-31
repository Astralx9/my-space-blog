FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY server ./server
RUN npm run server:build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/migrations ./server/migrations
RUN mkdir -p /data/media && chown -R node:node /app /data/media
USER node
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
