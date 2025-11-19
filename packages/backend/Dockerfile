FROM node:20-alpine

# Install dependencies required for Prisma and ffmpeg
RUN apk add --no-cache openssl ffmpeg

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/workers/package*.json ./packages/workers/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/workers ./packages/workers
# We might need shared types or utils if they exist, but for now copying what's needed.
# If there are other shared packages, they should be copied here.

# Generate Prisma client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Build the backend
RUN npm run build

# Build the workers
RUN cd ../workers && npm run build

# Expose port
EXPOSE 3001

# Start the server with workers
CMD ["npm", "run", "start:with-workers"]
