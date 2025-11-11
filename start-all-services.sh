#!/bin/bash

# Start all services required for the robust AI video dubbing pipeline

echo "=========================================="
echo "Starting All Pipeline Services"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -n "Waiting for $name to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗ Timeout${NC}"
    return 1
}

# 1. Start Whisper STT Service (Port 5001)
echo "1. Starting Whisper STT Service (Port 5001)..."
if check_port 5001; then
    echo -e "${YELLOW}Port 5001 already in use${NC}"
else
    cd packages/workers/docker/whisper
    python3 whisper_service.py > /tmp/whisper.log 2>&1 &
    echo $! > /tmp/whisper.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5001/health" "Whisper STT"
fi

# 2. Start Pyannote Diarization Service (Port 5002)
echo "2. Starting Pyannote Diarization Service (Port 5002)..."
if check_port 5002; then
    echo -e "${YELLOW}Port 5002 already in use${NC}"
else
    cd packages/workers/docker/pyannote
    python3 pyannote_service.py > /tmp/pyannote.log 2>&1 &
    echo $! > /tmp/pyannote.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5002/health" "Pyannote"
fi

# 3. Demucs Vocal Isolation (Port 5003) - Already running
echo "3. Checking Demucs Vocal Isolation Service (Port 5003)..."
if check_port 5003; then
    echo -e "${GREEN}✓ Demucs already running${NC}"
else
    cd packages/workers/docker/demucs
    python3 demucs_service.py > /tmp/demucs.log 2>&1 &
    echo $! > /tmp/demucs.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5003/health" "Demucs"
fi

# 4. Start Noisereduce Service (Port 5004)
echo "4. Starting Noisereduce Service (Port 5004)..."
if check_port 5004; then
    echo -e "${YELLOW}Port 5004 already in use${NC}"
else
    cd packages/workers/docker/noisereduce
    python3 noisereduce_service.py > /tmp/noisereduce.log 2>&1 &
    echo $! > /tmp/noisereduce.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5004/health" "Noisereduce"
fi

# 5. Start Emotion Analysis Service (Port 5007)
echo "5. Starting Emotion Analysis Service (Port 5007)..."
if check_port 5007; then
    echo -e "${YELLOW}Port 5007 already in use${NC}"
else
    cd packages/workers/docker/emotion
    python3 emotion_service.py > /tmp/emotion.log 2>&1 &
    echo $! > /tmp/emotion.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5007/health" "Emotion Analysis"
fi

# 6. Start OpenVoice TTS Service (Port 5008)
echo "6. Starting OpenVoice TTS Service (Port 5008)..."
if check_port 5008; then
    echo -e "${YELLOW}Port 5008 already in use${NC}"
else
    cd packages/workers/docker/openvoice
    python3 openvoice_service.py > /tmp/openvoice.log 2>&1 &
    echo $! > /tmp/openvoice.pid
    cd - > /dev/null
    wait_for_service "http://localhost:5008/health" "OpenVoice TTS"
fi

echo ""
echo "=========================================="
echo "Service Status Summary"
echo "=========================================="

# Check all services
services=(
    "5001:Whisper STT"
    "5002:Pyannote Diarization"
    "5003:Demucs Vocal Isolation"
    "5004:Noisereduce"
    "5007:Emotion Analysis"
    "5008:OpenVoice TTS"
)

all_running=true
for service in "${services[@]}"; do
    port="${service%%:*}"
    name="${service##*:}"
    if check_port $port; then
        echo -e "${GREEN}✓${NC} $name (Port $port)"
    else
        echo -e "${RED}✗${NC} $name (Port $port)"
        all_running=false
    fi
done

echo ""
if [ "$all_running" = true ]; then
    echo -e "${GREEN}All services are running!${NC}"
    echo ""
    echo "Log files are in /tmp:"
    echo "  - /tmp/whisper.log"
    echo "  - /tmp/pyannote.log"
    echo "  - /tmp/demucs.log"
    echo "  - /tmp/noisereduce.log"
    echo "  - /tmp/emotion.log"
    echo "  - /tmp/openvoice.log"
    echo ""
    echo "To stop all services, run: ./stop-all-services.sh"
else
    echo -e "${RED}Some services failed to start. Check log files in /tmp/${NC}"
fi

echo "=========================================="
