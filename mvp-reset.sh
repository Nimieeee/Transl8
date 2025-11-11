#!/bin/bash

# MVP Prototype - Reset Script
# This script resets the database and clears all data

echo "🔄 Resetting MVP Prototype"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Warning
echo -e "${RED}⚠️  WARNING: This will delete all data!${NC}"
echo ""
echo "This will:"
echo "  • Stop all services"
echo "  • Delete database and Redis data"
echo "  • Remove uploaded videos"
echo "  • Reset to fresh state"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""

# Step 1: Stop services
echo -e "${YELLOW}Step 1: Stopping services...${NC}"
docker-compose down -v

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services stopped and volumes removed${NC}"
else
    echo -e "${RED}✗ Failed to stop services${NC}"
    exit 1
fi

echo ""

# Step 2: Clean up uploaded files
echo -e "${YELLOW}Step 2: Cleaning up uploaded files...${NC}"

if [ -d "packages/backend/uploads" ]; then
    rm -rf packages/backend/uploads/*
    echo -e "${GREEN}✓ Uploads directory cleaned${NC}"
else
    echo -e "${GREEN}✓ No uploads to clean${NC}"
fi

if [ -d "packages/backend/temp" ]; then
    rm -rf packages/backend/temp/*
    echo -e "${GREEN}✓ Temp directory cleaned${NC}"
else
    echo -e "${GREEN}✓ No temp files to clean${NC}"
fi

echo ""

# Step 3: Start fresh database
echo -e "${YELLOW}Step 3: Starting fresh database...${NC}"
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

# Step 4: Initialize database
echo -e "${YELLOW}Step 4: Initializing database...${NC}"

cd packages/backend

npm run prisma:generate
npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${RED}✗ Database initialization failed${NC}"
    cd ../..
    exit 1
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Reset complete!${NC}"
echo ""
echo "Your MVP is now in a fresh state."
echo "To start the services, run: ./mvp-start.sh"
echo ""

