# Standalone backend Dockerfile
FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files from backend
COPY packages/backend/package*.json ./
COPY packages/backend/prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY packages/backend/src ./src
COPY packages/backend/tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
