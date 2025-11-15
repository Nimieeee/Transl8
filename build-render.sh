#!/bin/bash
set -e

echo "==> Installing root dependencies..."
npm install

echo "==> Installing backend dependencies..."
cd packages/backend
npm install
cd ../..

echo "==> Installing workers dependencies..."
cd packages/workers
npm install
cd ../..

echo "==> Generating Prisma client..."
npm run prisma:generate --workspace=@dubbing/backend

echo "==> Building backend..."
npm run build --workspace=@dubbing/backend

echo "==> Building workers..."
npm run build --workspace=@dubbing/workers

echo "==> Build complete!"
