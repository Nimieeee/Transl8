#!/bin/bash

# Start All Pipeline Services
# Starts: Demucs, Noisereduce, OpenVoice, and fixes Emotion service

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Starting Pipeline Services"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
fi

echo -e "${BLUE}Installing Python dependencies...${NC}"

# Install common dependencies
pip3 install -q fastapi uvicorn flask soundfile numpy noisereduce 2>/dev/null || true

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start service
start_service() {
    local name=$1
    local port=$2
    local path=$3
    local script=$4
    
    echo -e "${BLUE}Starting $name (port $port)...${NC}"
    
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port already in use${NC}"
        echo -e "${GREEN}✓ $name already running${NC}"
        return 0
    fi
    
    local root_dir=$(pwd)
    cd "$path"
    nohup python3 "$script" > "/tmp/${name}.log" 2>&1 &
    local pid=$!
    cd "$root_dir"
    
    # Wait for service to start
    sleep 3
    
    if check_port $port; then
        echo -e "${GREEN}✓ $name started (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}✗ $name failed to start${NC}"
        echo "Check logs: tail -f /tmp/${name}.log"
        return 1
    fi
}

# Start services
echo -e "${BLUE}1. Starting Demucs (Vocal Isolation)${NC}"
echo "----------------------------------------"
start_service "demucs" 8008 "packages/workers/docker/demucs" "demucs_service.py"
echo ""

echo -e "${BLUE}2. Starting Noisereduce (Noise Reduction)${NC}"
echo "----------------------------------------"
start_service "noisereduce" 8009 "packages/workers/docker/noisereduce" "noisereduce_service.py"
echo ""

echo -e "${BLUE}3. Starting OpenVoice V2 (Voice Synthesis)${NC}"
echo "----------------------------------------"
if check_port 8007; then
    echo -e "${GREEN}✓ OpenVoice already running${NC}"
else
    echo -e "${YELLOW}Starting OpenVoice V2 with conda...${NC}"
    echo "Run manually: cd packages/workers/docker/openvoice && ./start-openvoice.sh"
    echo -e "${YELLOW}⚠️  OpenVoice requires conda environment 'openvoice'${NC}"
fi
echo ""

echo -e "${BLUE}4. Starting Emotion Analysis (superb/wav2vec2-base-superb-er)${NC}"
echo "----------------------------------------"
if check_port 8010; then
    echo -e "${GREEN}✓ Emotion service already running${NC}"
else
    start_service "emotion" 8010 "packages/workers/docker/emotion" "emotion_service.py"
fi
echo ""

# Verify all services
echo "=========================================="
echo -e "${BLUE}📊 Service Status${NC}"
echo "=========================================="
echo ""

SERVICES_OK=0
SERVICES_TOTAL=4

check_service() {
    local name=$1
    local port=$2
    
    if check_port $port; then
        echo -e "${GREEN}✓${NC} $name (port $port)"
        ((SERVICES_OK++))
    else
        echo -e "${RED}✗${NC} $name (port $port) - Not running"
    fi
}

check_service "Demucs" 8008
check_service "Noisereduce" 8009
check_service "OpenVoice" 8007
check_service "Emotion" 8010

echo ""
echo "Services running: $SERVICES_OK/$SERVICES_TOTAL"
echo ""

if [ $SERVICES_OK -eq $SERVICES_TOTAL ]; then
    echo -e "${GREEN}🎉 All services started successfully!${NC}"
    echo ""
    echo -e "${BLUE}Test the pipeline:${NC}"
    echo "  ./run-pipeline-cli.sh test-video.mov"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    echo "  tail -f /tmp/demucs.log"
    echo "  tail -f /tmp/noisereduce.log"
    echo "  tail -f /tmp/openvoice.log"
    echo "  tail -f /tmp/emotion.log"
    echo ""
    echo -e "${BLUE}Stop services:${NC}"
    echo "  ./stop-pipeline-services.sh"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services failed to start${NC}"
    echo ""
    echo "Check logs for details:"
    echo "  tail -f /tmp/*.log"
    echo ""
    exit 1
fi
