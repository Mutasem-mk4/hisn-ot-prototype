FROM node:22.18.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.18.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY config ./config
COPY migrations ./migrations
RUN mkdir -p /app/var
EXPOSE 4310
CMD ["node", "dist/server/index.js"]
