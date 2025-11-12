# Dockerfile for deployment (Fly.io, Railway, etc.)
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/workers/package*.json ./packages/workers/

# Install dependencies including workspaces
RUN npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./packages/backend/prisma/schema.prisma

# Build backend and workers
RUN npm run build --workspace=@dubbing/backend
RUN npm run build --workspace=@dubbing/workers

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/workers/package*.json ./packages/workers/

RUN npm install --legacy-peer-deps --production

# Copy built files
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/packages/backend/start-with-workers.js ./packages/backend/
COPY --from=builder /app/packages/workers/dist ./packages/workers/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 8080

# Start both backend and workers
CMD ["node", "packages/backend/start-with-workers.js"]
