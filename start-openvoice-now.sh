#!/bin/bash

# Start OpenVoice Service Now

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🎤 Starting OpenVoice V2 Service"
echo "=========================================="
echo ""

# Check if already running
if lsof -ti:8007 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  OpenVoice already running on port 8007${NC}"
    echo "Stop it first with: kill \$(lsof -ti:8007)"
    exit 0
fi

# Check conda environment
if ! conda env list | grep -q "^openvoice "; then
    echo -e "${RED}❌ Conda environment 'openvoice' not found${NC}"
    echo "Run: ./setup-openvoice.sh"
    exit 1
fi

echo -e "${BLUE}Activating conda environment...${NC}"
eval "$(conda shell.bash hook)"
conda activate openvoice

echo -e "${GREEN}✓ Environment activated${NC}"
echo ""

# Check if OpenVoice is installed
if ! python -c "import openvoice" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  OpenVoice not installed in conda environment${NC}"
    echo "Installing OpenVoice..."
    cd packages/workers/docker/openvoice/OpenVoice
    pip install -e .
    cd - > /dev/null
    echo -e "${GREEN}✓ OpenVoice installed${NC}"
fi

# Check for checkpoints
if [ ! -d "packages/workers/docker/openvoice/checkpoints_v2" ]; then
    echo -e "${RED}❌ Checkpoints not found${NC}"
    echo "Run: ./setup-openvoice.sh"
    exit 1
fi

echo -e "${BLUE}Starting OpenVoice service...${NC}"

# Start service in background
cd packages/workers/docker/openvoice
nohup python openvoice_service_v2.py > /tmp/openvoice.log 2>&1 &
OPENVOICE_PID=$!
cd - > /dev/null

echo -e "${GREEN}✓ OpenVoice started (PID: $OPENVOICE_PID)${NC}"
echo ""

# Wait for service to be ready
echo "Waiting for service to initialize..."
sleep 10

# Check if service is responding
if curl -s -f http://localhost:8007/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OpenVoice service is healthy${NC}"
    echo ""
    echo "=========================================="
    echo "Service Information"
    echo "=========================================="
    curl -s http://localhost:8007/health | python3 -m json.tool
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ OpenVoice Ready!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Test the service:${NC}"
    echo "  curl http://localhost:8007/health"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    echo "  tail -f /tmp/openvoice.log"
    echo ""
else
    echo -e "${RED}✗ OpenVoice service not responding${NC}"
    echo ""
    echo "Check logs:"
    echo "  tail -f /tmp/openvoice.log"
    echo ""
    exit 1
fi
