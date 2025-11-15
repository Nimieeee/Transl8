#!/bin/bash

echo "Starting Video Dubbing Platform..."

# Check if .env files exist
if [ ! -f packages/backend/.env ]; then
  echo "Creating backend .env from example..."
  cp packages/backend/.env.example packages/backend/.env
fi

if [ ! -f packages/frontend/.env ]; then
  echo "Creating frontend .env from example..."
  cp packages/frontend/.env.example packages/frontend/.env
fi

if [ ! -f packages/workers/.env ]; then
  echo "Creating workers .env from example..."
  cp packages/workers/.env.example packages/workers/.env
fi

# Install dependencies
echo "Installing dependencies..."
cd packages/backend && npm install && cd ../..
cd packages/workers && npm install && cd ../..
cd packages/frontend && npm install && cd ../..

# Generate Prisma client
echo "Generating Prisma client..."
cd packages/backend && npx prisma generate && cd ../..

# Run migrations
echo "Running database migrations..."
cd packages/backend && npx prisma migrate deploy && cd ../..

echo ""
echo "Setup complete!"
echo ""
echo "To start the platform:"
echo "1. Start backend:  cd packages/backend && npm run dev"
echo "2. Start workers:  cd packages/workers && npm run dev"
echo "3. Start frontend: cd packages/frontend && npm run dev"
echo ""
echo "Make sure PostgreSQL and Redis are running!"
