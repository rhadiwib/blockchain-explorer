# Build stage
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/api/package*.json ./packages/api/

RUN npm ci

COPY packages/common/ ./packages/common/
COPY packages/api/ ./packages/api/

RUN npm run clean
RUN npm run build:common && npm run build:api

# Production stage
FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

RUN mkdir -p /app/logs && chmod 777 /app/logs

ENV NODE_ENV=production

COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/api/package*.json ./packages/api/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

EXPOSE 3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/logs
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# run the application
CMD ["node", "packages/api/dist/index.js"]