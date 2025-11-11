#!/bin/bash

# Reset Database and Start Fresh

echo "🔄 Resetting database and starting fresh..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Stop and remove existing containers
echo -e "${YELLOW}Step 1: Cleaning up existing containers...${NC}"
docker-compose down -v

echo -e "${GREEN}✓ Containers stopped and volumes removed${NC}"
echo ""

# Step 2: Start fresh database
echo -e "${YELLOW}Step 2: Starting fresh PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

echo "Waiting for database to be ready..."
sleep 8

if docker ps | grep -q dubbing-postgres; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    exit 1
fi

if docker ps | grep -q dubbing-redis; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis failed to start${NC}"
    exit 1
fi

echo ""

# Step 3: Push schema to database (creates tables without migration history)
echo -e "${YELLOW}Step 3: Creating database schema...${NC}"
cd packages/backend
npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema created${NC}"
else
    echo -e "${RED}✗ Schema creation failed${NC}"
    exit 1
fi

echo ""

# Step 4: Generate Prisma Client
echo -e "${YELLOW}Step 4: Generating Prisma client...${NC}"
npm run prisma:generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${RED}✗ Prisma generation failed${NC}"
    exit 1
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Database is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd packages/backend && npm run dev"
echo "2. Start frontend: cd packages/frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
