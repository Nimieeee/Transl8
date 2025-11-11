#!/bin/bash

# MVP Prototype - Stop Script
# This script stops all running services

echo "🛑 Stopping MVP Prototype Services"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Stop Docker containers
echo -e "${YELLOW}Stopping Docker containers...${NC}"
docker-compose down

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker containers stopped${NC}"
else
    echo -e "${RED}✗ Failed to stop Docker containers${NC}"
fi

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
echo "To start again, run: ./mvp-start.sh"
echo ""

