#!/bin/bash

# Stop All Pipeline Services

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🛑 Stopping Pipeline Services"
echo "=========================================="
echo ""

# Function to stop service on port
stop_port() {
    local name=$1
    local port=$2
    
    echo -e "${BLUE}Stopping $name (port $port)...${NC}"
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}⚠️  No process found on port $port${NC}"
    else
        for pid in $pids; do
            kill -9 $pid 2>/dev/null && echo -e "${GREEN}✓ Stopped PID $pid${NC}" || echo -e "${YELLOW}⚠️  Could not stop PID $pid${NC}"
        done
    fi
}

stop_port "Demucs" 8008
stop_port "Noisereduce" 8009
stop_port "OpenVoice" 8007
stop_port "Emotion" 8010

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
