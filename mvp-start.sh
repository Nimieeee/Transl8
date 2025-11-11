#!/bin/bash

# MVP Prototype - Simple Startup Script
# This script starts all services needed for the MVP prototype

echo "🚀 Starting MVP Prototype"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :"$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker from https://docker.com"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Step 1: Setup environment files
echo -e "${YELLOW}Step 1: Setting up environment variables...${NC}"

# Backend .env
if [ ! -f packages/backend/.env ]; then
    cat > packages/backend/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=mvp-dev-secret-change-in-production
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
API_PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ Created packages/backend/.env${NC}"
else
    echo -e "${GREEN}✓ packages/backend/.env already exists${NC}"
fi

# Workers .env
if [ ! -f packages/workers/.env ]; then
    cat > packages/workers/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=1
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ Created packages/workers/.env${NC}"
else
    echo -e "${GREEN}✓ packages/workers/.env already exists${NC}"
fi

# Frontend .env.local
if [ ! -f packages/frontend/.env.local ]; then
    cat > packages/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    echo -e "${GREEN}✓ Created packages/frontend/.env.local${NC}"
else
    echo -e "${GREEN}✓ packages/frontend/.env.local already exists${NC}"
fi

echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
echo "This may take a few minutes on first run..."

npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# Step 3: Start database and Redis
echo -e "${YELLOW}Step 3: Starting PostgreSQL and Redis...${NC}"

docker-compose up -d postgres redis

echo "Waiting for services to be ready..."
sleep 8

# Check if services are running
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

# Step 4: Initialize database
echo -e "${YELLOW}Step 4: Setting up database schema...${NC}"

cd packages/backend

# Generate Prisma client first
npm run prisma:generate

# Push schema to database
npm run db:push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema created${NC}"
else
    echo -e "${RED}✗ Database setup failed${NC}"
    echo "Check your DATABASE_URL in packages/backend/.env"
    cd ../..
    exit 1
fi

cd ../..

echo ""

# Step 5: Start all services
echo -e "${YELLOW}Step 5: Starting application services...${NC}"
echo ""
echo -e "${BLUE}Starting backend, frontend, and worker...${NC}"
echo -e "${BLUE}This will open in the current terminal.${NC}"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Services will start now:"
echo "  • Backend API:  http://localhost:3001"
echo "  • Frontend:     http://localhost:3000"
echo "  • Worker:       Processing jobs in background"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""
sleep 2

# Start all services using npm workspace commands
npm run dev

