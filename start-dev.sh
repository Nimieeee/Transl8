#!/bin/bash

# AI Video Dubbing Platform - Development Startup Script

echo "🚀 Starting AI Video Dubbing Platform (Development Mode)"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Start Database and Redis
echo -e "${YELLOW}Step 1: Starting PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for services to be healthy
echo "Waiting for database to be ready..."
sleep 5

# Check if database is running
if docker ps | grep -q dubbing-postgres; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    echo "Try: docker-compose logs postgres"
    exit 1
fi

if docker ps | grep -q dubbing-redis; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis failed to start${NC}"
    echo "Try: docker-compose logs redis"
    exit 1
fi

echo ""

# Step 2: Initialize Database
echo -e "${YELLOW}Step 2: Initializing database schema...${NC}"
cd packages/backend

# Use db push for initial setup (creates schema without migration history)
npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema created successfully${NC}"
else
    echo -e "${RED}✗ Database initialization failed${NC}"
    echo "Check your DATABASE_URL in packages/backend/.env"
    exit 1
fi

echo ""

# Step 3: Generate Prisma Client
echo -e "${YELLOW}Step 3: Generating Prisma client...${NC}"
npm run prisma:generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${RED}✗ Prisma generation failed${NC}"
    exit 1
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd packages/backend && npm run dev"
echo "2. Start frontend: cd packages/frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "Admin email configured: odunewutolu2@gmail.com"
echo ""
