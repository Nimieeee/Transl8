# Dockerfile for Fly.io deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/workers/package*.json ./packages/workers/

# Install dependencies (use ci for production builds)
RUN npm ci --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./packages/backend/prisma/schema.prisma

# Build backend only (workers have type errors, can be fixed later)
RUN npm run build --workspace=@dubbing/backend

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/packages/backend/package.json ./packages/backend/
COPY --from=builder /app/packages/workers/src ./packages/workers/src
COPY --from=builder /app/packages/workers/package.json ./packages/workers/
COPY --from=builder /app/packages/workers/tsconfig.json ./packages/workers/
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start", "--workspace=@dubbing/backend"]
