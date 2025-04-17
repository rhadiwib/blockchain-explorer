# Build stage
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/indexer/package*.json ./packages/indexer/

RUN npm ci

COPY packages/common/ ./packages/common/
COPY packages/indexer/ ./packages/indexer/

RUN npm run clean
RUN npm run build:common && npm run build:indexer

# Production stage
FROM node:18-alpine

WORKDIR /app

RUN mkdir -p /app/logs && chmod 777 /app/logs

ENV NODE_ENV=production

COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/indexer/package*.json ./packages/indexer/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/indexer/dist ./packages/indexer/dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/logs
USER appuser

# run the application
CMD ["node", "packages/indexer/dist/index.js"]