#!/bin/bash

# Fix All Services Script
# Installs dependencies for Demucs, Noisereduce, and sets up OpenVoice

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔧 Fixing All Services"
echo "=========================================="
echo ""

# 1. Install Demucs
echo -e "${BLUE}1. Installing Demucs...${NC}"
echo "----------------------------------------"

if python3 -c "import demucs" 2>/dev/null; then
    echo -e "${GREEN}✓ Demucs already installed${NC}"
else
    echo "Installing Demucs..."
    pip3 install -q demucs 2>/dev/null || pip3 install demucs
    echo -e "${GREEN}✓ Demucs installed${NC}"
fi
echo ""

# 2. Verify Noisereduce
echo -e "${BLUE}2. Verifying Noisereduce...${NC}"
echo "----------------------------------------"

if python3 -c "import noisereduce" 2>/dev/null; then
    echo -e "${GREEN}✓ Noisereduce already installed${NC}"
else
    echo "Installing noisereduce..."
    pip3 install -q noisereduce soundfile 2>/dev/null || pip3 install noisereduce soundfile
    echo -e "${GREEN}✓ Noisereduce installed${NC}"
fi
echo ""

# 3. Restart services
echo -e "${BLUE}3. Restarting services...${NC}"
echo "----------------------------------------"

# Kill existing services
for port in 8008 8009; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "Stopping service on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

sleep 2

# Start Demucs
echo "Starting Demucs service..."
cd packages/workers/docker/demucs
nohup python3 demucs_service.py > /tmp/demucs.log 2>&1 &
DEMUCS_PID=$!
cd - > /dev/null

sleep 3

# Start Noisereduce
echo "Starting Noisereduce service..."
cd packages/workers/docker/noisereduce
nohup python3 noisereduce_service.py > /tmp/noisereduce.log 2>&1 &
NOISEREDUCE_PID=$!
cd - > /dev/null

sleep 3

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# 4. Test services
echo -e "${BLUE}4. Testing services...${NC}"
echo "----------------------------------------"

# Test Demucs
if curl -s -f http://localhost:8008/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Demucs (port 8008) - healthy${NC}"
else
    echo -e "${RED}✗ Demucs (port 8008) - not responding${NC}"
fi

# Test Noisereduce
if curl -s -f http://localhost:8009/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Noisereduce (port 8009) - healthy${NC}"
else
    echo -e "${RED}✗ Noisereduce (port 8009) - not responding${NC}"
fi

# Test Emotion
if curl -s -f http://localhost:8010/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Emotion (port 8010) - healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Emotion (port 8010) - not running${NC}"
    echo "Start with: ./start-emotion-service.sh"
fi

echo ""

# 5. OpenVoice setup
echo -e "${BLUE}5. OpenVoice Setup${NC}"
echo "----------------------------------------"

if curl -s -f http://localhost:8007/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OpenVoice already running${NC}"
else
    echo -e "${YELLOW}⚠️  OpenVoice not configured${NC}"
    echo ""
    echo "OpenVoice requires manual setup:"
    echo "  1. Run: ./setup-openvoice.sh"
    echo "  2. Follow the prompts"
    echo "  3. Choose V2 for more language support"
    echo ""
    echo "Or skip OpenVoice for now (optional service)"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Service Fix Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${BLUE}Service Status:${NC}"
curl -s http://localhost:8008/health 2>/dev/null && echo "  ✓ Demucs" || echo "  ✗ Demucs"
curl -s http://localhost:8009/health 2>/dev/null && echo "  ✓ Noisereduce" || echo "  ✗ Noisereduce"
curl -s http://localhost:8010/health 2>/dev/null && echo "  ✓ Emotion" || echo "  ✗ Emotion"
curl -s http://localhost:8007/health 2>/dev/null && echo "  ✓ OpenVoice" || echo "  ⚠ OpenVoice (optional)"

echo ""
echo -e "${BLUE}Test the pipeline:${NC}"
echo "  ./run-pipeline-cli.sh test-video.mov"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo "  tail -f /tmp/demucs.log"
echo "  tail -f /tmp/noisereduce.log"
echo ""
