# Workers Service Dockerfile
FROM node:20-alpine

# Install dependencies required for ffmpeg and others
RUN apk add --no-cache openssl ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/workers/package*.json ./packages/workers/
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/workers ./packages/workers
COPY packages/backend/src/adapters ./packages/backend/src/adapters
COPY packages/backend/prisma ./packages/backend/prisma

# Generate Prisma client
RUN cd packages/backend && npx prisma generate

# Build TypeScript
RUN cd packages/workers && npm run build

WORKDIR /app/packages/workers

CMD ["npm", "start"]
