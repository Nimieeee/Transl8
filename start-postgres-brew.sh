#!/bin/bash

# Start PostgreSQL using Homebrew (No Docker Required)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🗄️  Starting PostgreSQL (Homebrew)"
echo "=========================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    echo ""
    brew install postgresql@14
    echo ""
fi

# Start PostgreSQL service
echo "Starting PostgreSQL service..."
brew services start postgresql@14

sleep 3

# Check if it's running
if brew services list | grep postgresql@14 | grep -q started; then
    echo -e "${GREEN}✓ PostgreSQL service started${NC}"
else
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    echo "Try manually: brew services start postgresql@14"
    exit 1
fi

echo ""

# Create database if it doesn't exist
echo "Creating database..."
if psql postgres -lqt | cut -d \| -f 1 | grep -qw dubbing_platform; then
    echo -e "${YELLOW}Database 'dubbing_platform' already exists${NC}"
else
    createdb dubbing_platform
    echo -e "${GREEN}✓ Database 'dubbing_platform' created${NC}"
fi

echo ""
echo "=========================================="
echo "Database Information"
echo "=========================================="
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: dubbing_platform"
echo "  User: $(whoami)"
echo ""
echo "Connection string:"
echo "  postgresql://$(whoami)@localhost:5432/dubbing_platform"
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database Ready!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Update .env with your username:"
echo "     DATABASE_URL=postgresql://$(whoami)@localhost:5432/dubbing_platform"
echo ""
echo "  2. Run migrations:"
echo "     cd packages/backend && npx prisma migrate dev"
echo ""
echo "  3. Start backend:"
echo "     npm run dev"
echo ""
