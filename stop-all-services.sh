#!/bin/bash

# Stop all pipeline services

echo "=========================================="
echo "Stopping All Pipeline Services"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop services by PID files
pid_files=(
    "/tmp/backend.pid:Backend API"
    "/tmp/workers.pid:Workers"
    "/tmp/whisper.pid:Whisper STT"
    "/tmp/pyannote.pid:Pyannote Diarization"
    "/tmp/demucs.pid:Demucs Vocal Isolation"
    "/tmp/noisereduce.pid:Noisereduce"
    "/tmp/emotion.pid:Emotion Analysis"
    "/tmp/openvoice.pid:OpenVoice TTS"
)

for pid_file_info in "${pid_files[@]}"; do
    pid_file="${pid_file_info%%:*}"
    name="${pid_file_info##*:}"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            echo -e "${GREEN}✓${NC} Stopped $name (PID: $pid)"
        else
            echo -e "${YELLOW}⚠${NC} $name process not found (PID: $pid)"
        fi
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠${NC} $name: No PID file found"
    fi
done

# Also kill by port if needed
echo ""
echo "Checking for processes on ports..."
ports=(3001 3002 5001 5002 5003 5004 5007 5008)
for port in "${ports[@]}"; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        kill "$pid" 2>/dev/null
        echo -e "${GREEN}✓${NC} Killed process on port $port (PID: $pid)"
    fi
done

echo ""
echo -e "${GREEN}All services stopped.${NC}"
echo "=========================================="
