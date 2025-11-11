#!/bin/bash

# Quick status check for all services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Service Status Check"
echo -e "==========================================${NC}\n"

services=(
    "3001:Backend API:http://localhost:3001/health"
    "5001:Whisper STT:http://localhost:5001/health"
    "5002:Pyannote Diarization:http://localhost:5002/health"
    "5003:Demucs Vocal Isolation:http://localhost:5003/health"
    "5004:Noisereduce:http://localhost:5004/health"
    "5007:Emotion Analysis:http://localhost:5007/health"
    "5008:OpenVoice TTS:http://localhost:5008/health"
)

all_running=true
running_count=0
total_count=${#services[@]}

for service in "${services[@]}"; do
    IFS=':' read -r port name url <<< "$service"
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name (Port $port)"
        ((running_count++))
    else
        echo -e "${RED}✗${NC} $name (Port $port)"
        all_running=false
    fi
done

echo ""
echo -e "${BLUE}Status: $running_count/$total_count services running${NC}"

if [ "$all_running" = true ]; then
    echo -e "${GREEN}All services are operational! ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}Some services are not running.${NC}"
    echo "Run './setup-and-start-all.sh' to start all services"
    exit 1
fi
