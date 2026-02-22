FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner

RUN addgroup -S legion && adduser -S legion -G legion
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
RUN mkdir -p /app/data && chown -R legion:legion /app

USER legion
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/index.js"]
