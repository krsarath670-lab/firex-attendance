# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5050

COPY package*.json ./
RUN npm ci --only=production

# Copy backend server and build output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Ensure data directory exists
RUN mkdir -p server/data/backups

EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5050/api/health || exit 1

CMD ["node", "server/index.js"]
