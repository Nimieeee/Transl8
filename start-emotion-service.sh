#!/bin/bash

# Quick Start Script for Emotion Analysis Service
# Uses superb/wav2vec2-base-superb-er model

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🎭 Emotion Analysis Service"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
fi

echo -e "${BLUE}Installing dependencies...${NC}"

# Install required packages
pip3 install -q torch torchaudio transformers librosa soundfile flask numpy 2>/dev/null || {
    echo -e "${YELLOW}Some packages may already be installed${NC}"
}

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check if port is in use
if lsof -Pi :8010 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8010 already in use${NC}"
    echo "Stop existing service? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8010 | xargs kill -9
        echo -e "${GREEN}✓ Stopped existing service${NC}"
    else
        echo "Exiting..."
        exit 0
    fi
fi

echo -e "${BLUE}Starting Emotion Analysis Service...${NC}"
echo "Model: superb/wav2vec2-base-superb-er"
echo "Port: 8010"
echo "Device: CPU"
echo ""

cd packages/workers/docker/emotion

# Start service
python3 emotion_service.py &
SERVICE_PID=$!

echo -e "${GREEN}✓ Service started (PID: $SERVICE_PID)${NC}"
echo ""

# Wait for service to be ready
echo "Waiting for service to initialize..."
sleep 5

# Test health check
if curl -s http://localhost:8010/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
    echo ""
    echo "=========================================="
    echo "Service Information"
    echo "=========================================="
    curl -s http://localhost:8010/health | python3 -m json.tool
    echo ""
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Test the service:${NC}"
    echo "  python3 test-emotion-service.py"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    echo "  tail -f /tmp/emotion.log"
    echo ""
    echo -e "${BLUE}Stop service:${NC}"
    echo "  kill $SERVICE_PID"
    echo ""
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check logs for details"
    kill $SERVICE_PID 2>/dev/null || true
    exit 1
fi
