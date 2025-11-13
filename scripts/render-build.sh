#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate --schema=packages/backend/prisma/schema.prisma

echo "Running database migrations..."
npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma

echo "Building backend..."
npm run build --workspace=@dubbing/backend

echo "Building workers..."
npm run build --workspace=@dubbing/workers

echo "Build complete!"
