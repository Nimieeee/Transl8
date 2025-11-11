#!/bin/bash

# Start PostgreSQL Database for Development

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🗄️  Starting PostgreSQL Database"
echo "=========================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo ""
    echo "Install Docker Desktop or use PostgreSQL directly:"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    echo ""
    exit 1
fi

# Check if Docker daemon is accessible
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not accessible${NC}"
    echo ""
    echo "Please start Docker Desktop and try again"
    echo ""
    echo "Or install PostgreSQL directly:"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    echo ""
    exit 1
fi

# Check if PostgreSQL container exists
if docker ps -a | grep -q dubbing-postgres; then
    echo -e "${YELLOW}PostgreSQL container exists${NC}"
    
    # Check if it's running
    if docker ps | grep -q dubbing-postgres; then
        echo -e "${GREEN}✓ PostgreSQL already running${NC}"
    else
        echo "Starting existing container..."
        docker start dubbing-postgres
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    fi
else
    echo "Creating new PostgreSQL container..."
    docker run -d \
      --name dubbing-postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=dubbing_platform \
      -p 5432:5432 \
      postgres:14-alpine
    
    echo -e "${GREEN}✓ PostgreSQL container created and started${NC}"
    echo ""
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

echo ""

# Test connection
echo "Testing connection..."
if docker exec dubbing-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
    echo ""
    echo "=========================================="
    echo "Database Information"
    echo "=========================================="
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: dubbing_platform"
    echo "  User: postgres"
    echo "  Password: postgres"
    echo ""
    echo "Connection string:"
    echo "  postgresql://postgres:postgres@localhost:5432/dubbing_platform"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ Database Ready!${NC}"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Run migrations: cd packages/backend && npx prisma migrate dev"
    echo "  2. Start backend: cd packages/backend && npm run dev"
    echo ""
else
    echo -e "${RED}✗ PostgreSQL not responding${NC}"
    echo "Check logs: docker logs dubbing-postgres"
    exit 1
fi
