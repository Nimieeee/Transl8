#!/bin/bash

# Comprehensive setup and startup script for the AI Video Dubbing Platform
# This script will install dependencies and start all services

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "AI Video Dubbing Platform - Complete Setup"
echo -e "==========================================${NC}\n"

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "This script is optimized for macOS. Some steps may need adjustment for other OS."
fi

# 1. Install Python dependencies for all services
print_status "Step 1: Installing Python dependencies for all services..."

services=(
    "packages/workers/docker/whisper"
    "packages/workers/docker/pyannote"
    "packages/workers/docker/demucs"
    "packages/workers/docker/noisereduce"
    "packages/workers/docker/emotion"
    "packages/workers/docker/openvoice"
    "packages/workers/python"
)

for service in "${services[@]}"; do
    if [ -f "$service/requirements.txt" ]; then
        print_status "Installing dependencies for $service..."
        pip3 install -r "$service/requirements.txt" --quiet || print_warning "Some dependencies for $service may have failed"
    fi
done

print_success "Python dependencies installed"

# 2. Check and start PostgreSQL
print_status "Step 2: Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    print_warning "PostgreSQL not running. Attempting to start..."
    if command -v brew &> /dev/null; then
        brew services start postgresql@15 || brew services start postgresql
    else
        print_error "PostgreSQL not running. Please start it manually."
        exit 1
    fi
    sleep 3
fi

# Create database if it doesn't exist
psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw dubbing_platform || {
    print_status "Creating database..."
    createdb -h localhost -U postgres dubbing_platform
}
print_success "PostgreSQL is ready"

# 3. Check and start Redis
print_status "Step 3: Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    print_warning "Redis not running. Attempting to start..."
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        redis-server --daemonize yes
    fi
    sleep 2
fi
print_success "Redis is ready"

# 4. Run database migrations
print_status "Step 4: Running database migrations..."
cd packages/backend
npx prisma migrate deploy || print_warning "Migrations may have already been applied"
npx prisma generate
cd ../..
print_success "Database migrations complete"

# 5. Start Backend API
print_status "Step 5: Starting Backend API..."
if lsof -i :3001 > /dev/null 2>&1; then
    print_warning "Port 3001 already in use. Killing existing process..."
    kill $(lsof -ti :3001) 2>/dev/null || true
    sleep 2
fi

cd packages/backend
npm install --silent
npm run dev > /tmp/backend.log 2>&1 &
echo $! > /tmp/backend.pid
cd ../..

# Wait for backend to be ready
print_status "Waiting for Backend API..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend API is running"
        break
    fi
    sleep 2
done

# 6. Start all Python services
print_status "Step 6: Starting Python AI services..."

# Function to start a Python service
start_python_service() {
    local service_dir=$1
    local service_name=$2
    local port=$3
    local script_name=$4
    
    print_status "Starting $service_name on port $port..."
    
    if lsof -i :$port > /dev/null 2>&1; then
        print_warning "Port $port already in use"
        return
    fi
    
    cd "$service_dir"
    python3 "$script_name" > "/tmp/${service_name}.log" 2>&1 &
    echo $! > "/tmp/${service_name}.pid"
    cd - > /dev/null
    
    # Wait for service
    for i in {1..20}; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service_name is running"
            return
        fi
        sleep 3
    done
    print_warning "$service_name may not have started. Check /tmp/${service_name}.log"
}

# Start each service
start_python_service "packages/workers/docker/whisper" "whisper" "5001" "whisper_service.py"
start_python_service "packages/workers/docker/pyannote" "pyannote" "5002" "pyannote_service.py"
start_python_service "packages/workers/docker/demucs" "demucs" "5003" "demucs_service.py"
start_python_service "packages/workers/docker/noisereduce" "noisereduce" "5004" "noisereduce_service.py"
start_python_service "packages/workers/docker/emotion" "emotion" "5007" "emotion_service.py"
start_python_service "packages/workers/docker/openvoice" "openvoice" "5008" "openvoice_service.py"

# 7. Start Workers
print_status "Step 7: Starting Workers..."
if lsof -i :3002 > /dev/null 2>&1; then
    print_warning "Workers port already in use. Killing existing process..."
    kill $(lsof -ti :3002) 2>/dev/null || true
    sleep 2
fi

cd packages/workers
npm install --silent
npm run dev > /tmp/workers.log 2>&1 &
echo $! > /tmp/workers.pid
cd ../..
print_success "Workers started"

# 8. Verify all services
print_status "Step 8: Verifying all services..."
echo ""
echo -e "${BLUE}=========================================="
echo "Service Status"
echo -e "==========================================${NC}"

services_check=(
    "3001:Backend API:http://localhost:3001/health"
    "5001:Whisper STT:http://localhost:5001/health"
    "5002:Pyannote Diarization:http://localhost:5002/health"
    "5003:Demucs Vocal Isolation:http://localhost:5003/health"
    "5004:Noisereduce:http://localhost:5004/health"
    "5007:Emotion Analysis:http://localhost:5007/health"
    "5008:OpenVoice TTS:http://localhost:5008/health"
)

all_running=true
for service in "${services_check[@]}"; do
    IFS=':' read -r port name url <<< "$service"
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name (Port $port)"
    else
        echo -e "${RED}✗${NC} $name (Port $port) - Check /tmp/$(echo $name | tr ' ' '_' | tr '[:upper:]' '[:lower:]').log"
        all_running=false
    fi
done

echo ""
if [ "$all_running" = true ]; then
    echo -e "${GREEN}=========================================="
    echo "All services are running successfully! 🎉"
    echo -e "==========================================${NC}"
    echo ""
    echo "You can now:"
    echo "  1. Run the test: python3 test-robust-pipeline.py"
    echo "  2. Access the API at: http://localhost:3001"
    echo "  3. View logs in /tmp/*.log"
    echo ""
    echo "To stop all services: ./stop-all-services.sh"
else
    echo -e "${YELLOW}=========================================="
    echo "Some services failed to start"
    echo -e "==========================================${NC}"
    echo ""
    echo "Check the log files in /tmp/ for details:"
    echo "  - /tmp/backend.log"
    echo "  - /tmp/whisper.log"
    echo "  - /tmp/pyannote.log"
    echo "  - /tmp/demucs.log"
    echo "  - /tmp/noisereduce.log"
    echo "  - /tmp/emotion.log"
    echo "  - /tmp/openvoice.log"
    echo "  - /tmp/workers.log"
fi

echo ""
