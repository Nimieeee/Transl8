#!/bin/bash

# System Readiness Check
# Verifies all components are ready for testing

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔍 System Readiness Check"
echo "=========================================="
echo ""

READY=true

# Function to check service
check_service() {
    local name=$1
    local port=$2
    local required=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name (port $port)${NC}"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $name (port $port) - NOT RUNNING${NC}"
            READY=false
        else
            echo -e "${YELLOW}⚠️  $name (port $port) - Optional${NC}"
        fi
        return 1
    fi
}

# Function to check file/directory
check_path() {
    local name=$1
    local path=$2
    local type=$3
    
    if [ "$type" = "dir" ]; then
        if [ -d "$path" ]; then
            echo -e "${GREEN}✅ $name${NC}"
            return 0
        fi
    else
        if [ -f "$path" ]; then
            echo -e "${GREEN}✅ $name${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}❌ $name - NOT FOUND${NC}"
    READY=false
    return 1
}

# Function to check command
check_command() {
    local name=$1
    local cmd=$2
    
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "${RED}❌ $name - NOT INSTALLED${NC}"
        READY=false
        return 1
    fi
}

echo -e "${BLUE}1. Checking Core Services${NC}"
echo "----------------------------------------"
check_service "Demucs (Vocal Isolation)" 8008 "required"
check_service "Noisereduce (Noise Reduction)" 8009 "required"
check_service "Emotion Analysis" 8010 "required"
check_service "OpenVoice V2 (TTS)" 8007 "required"
echo ""

echo -e "${BLUE}2. Checking Backend Services${NC}"
echo "----------------------------------------"
check_service "Backend API" 3000 "optional"
check_service "Redis" 6379 "optional"
check_service "PostgreSQL" 5432 "optional"
echo ""

echo -e "${BLUE}3. Checking OpenVoice Installation${NC}"
echo "----------------------------------------"
check_path "OpenVoice Repository" "packages/workers/docker/openvoice/OpenVoice" "dir"
check_path "OpenVoice Checkpoints V2" "packages/workers/docker/openvoice/checkpoints_v2" "dir"
check_path "OpenVoice Service" "packages/workers/docker/openvoice/openvoice_service_v2.py" "file"
check_path "OpenVoice Startup Script" "packages/workers/docker/openvoice/start-openvoice.sh" "file"
echo ""

echo -e "${BLUE}4. Checking Python Services${NC}"
echo "----------------------------------------"
check_path "Demucs Service" "packages/workers/docker/demucs/demucs_service.py" "file"
check_path "Noisereduce Service" "packages/workers/docker/noisereduce/noisereduce_service.py" "file"
check_path "Emotion Service" "packages/workers/docker/emotion/emotion_service.py" "file"
echo ""

echo -e "${BLUE}5. Checking System Dependencies${NC}"
echo "----------------------------------------"
check_command "Python 3" "python3"
check_command "Node.js" "node"
check_command "Conda" "conda"
check_command "FFmpeg" "ffmpeg"
echo ""

echo -e "${BLUE}6. Checking Conda Environment${NC}"
echo "----------------------------------------"
if conda env list 2>/dev/null | grep -q "^openvoice "; then
    echo -e "${GREEN}✅ OpenVoice conda environment${NC}"
else
    echo -e "${RED}❌ OpenVoice conda environment - NOT FOUND${NC}"
    READY=false
fi
echo ""

echo "=========================================="
if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ SYSTEM READY FOR TESTING${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. If services aren't running, start them:"
    echo "   Terminal 1: ./start-pipeline-services.sh"
    echo "   Terminal 2: cd packages/workers/docker/openvoice && ./start-openvoice.sh"
    echo ""
    echo "2. Test individual services:"
    echo "   ./test-openvoice-service.sh"
    echo ""
    echo "3. Run full pipeline test:"
    echo "   ./run-pipeline-cli.sh test-video.mov"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SYSTEM NOT READY${NC}"
    echo "=========================================="
    echo ""
    echo -e "${YELLOW}Issues Found:${NC}"
    echo ""
    
    # Provide specific fixes
    if ! lsof -Pi :8007 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "• OpenVoice not running:"
        echo "  cd packages/workers/docker/openvoice && ./start-openvoice.sh"
        echo ""
    fi
    
    if ! lsof -Pi :8008,8009,8010 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "• Pipeline services not running:"
        echo "  ./start-pipeline-services.sh"
        echo ""
    fi
    
    if [ ! -d "packages/workers/docker/openvoice/checkpoints_v2" ]; then
        echo "• OpenVoice checkpoints missing:"
        echo "  ./setup-openvoice.sh"
        echo ""
    fi
    
    if ! conda env list 2>/dev/null | grep -q "^openvoice "; then
        echo "• OpenVoice conda environment missing:"
        echo "  ./setup-openvoice.sh"
        echo ""
    fi
    
    echo "See SERVICES_SETUP_COMPLETE.md for detailed instructions."
    echo ""
    exit 1
fi
