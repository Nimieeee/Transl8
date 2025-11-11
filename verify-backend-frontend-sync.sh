#!/bin/bash

# Verify Backend/Frontend Sync with Services

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔍 Backend/Frontend Sync Verification"
echo "=========================================="
echo ""

# Check service ports
echo -e "${BLUE}1. Checking Service Ports${NC}"
echo "----------------------------------------"

check_service() {
    local name=$1
    local port=$2
    if curl -s -f http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name running on port $port"
        return 0
    else
        echo -e "${RED}✗${NC} $name NOT running on port $port"
        return 1
    fi
}

SERVICES_OK=0
check_service "Demucs" 8008 && ((SERVICES_OK++))
check_service "Noisereduce" 8009 && ((SERVICES_OK++))
check_service "Emotion" 8010 && ((SERVICES_OK++))
check_service "OpenVoice" 8007 && ((SERVICES_OK++))

echo ""
echo "Services running: $SERVICES_OK/4"
echo ""

# Check backend adapter configurations
echo -e "${BLUE}2. Checking Backend Adapter Configurations${NC}"
echo "----------------------------------------"

check_port_in_file() {
    local file=$1
    local expected_port=$2
    local service_name=$3
    
    if grep -q "localhost:$expected_port" "$file"; then
        echo -e "${GREEN}✓${NC} $service_name adapter configured for port $expected_port"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name adapter NOT configured for port $expected_port"
        grep "localhost:" "$file" | head -1
        return 1
    fi
}

ADAPTERS_OK=0
check_port_in_file "packages/backend/src/adapters/demucs-adapter.ts" "8008" "Demucs" && ((ADAPTERS_OK++))
check_port_in_file "packages/backend/src/adapters/noisereduce-adapter.ts" "8009" "Noisereduce" && ((ADAPTERS_OK++))
check_port_in_file "packages/backend/src/adapters/emotion-adapter.ts" "8010" "Emotion" && ((ADAPTERS_OK++))
check_port_in_file "packages/workers/src/tts-worker.ts" "8007" "OpenVoice" && ((ADAPTERS_OK++))

echo ""
echo "Adapters configured: $ADAPTERS_OK/4"
echo ""

# Check if backend dependencies are installed
echo -e "${BLUE}3. Checking Backend Dependencies${NC}"
echo "----------------------------------------"

if [ -d "packages/backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Backend node_modules exists"
    BACKEND_DEPS=1
else
    echo -e "${RED}✗${NC} Backend node_modules missing"
    echo "  Run: cd packages/backend && npm install"
    BACKEND_DEPS=0
fi

# Check if frontend dependencies are installed
if [ -d "packages/frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend node_modules exists"
    FRONTEND_DEPS=1
else
    echo -e "${RED}✗${NC} Frontend node_modules missing"
    echo "  Run: cd packages/frontend && npm install"
    FRONTEND_DEPS=0
fi

echo ""

# Check database
echo -e "${BLUE}4. Checking Database${NC}"
echo "----------------------------------------"

if [ -f "packages/backend/prisma/dev.db" ]; then
    echo -e "${GREEN}✓${NC} Database file exists"
    DB_OK=1
else
    echo -e "${YELLOW}⚠️${NC}  Database file not found"
    echo "  Run: cd packages/backend && npx prisma migrate dev"
    DB_OK=0
fi

echo ""

# Check environment variables
echo -e "${BLUE}5. Checking Environment Variables${NC}"
echo "----------------------------------------"

ENV_OK=0

if grep -q "OPENAI_API_KEY=" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OPENAI_API_KEY configured"
    ((ENV_OK++))
else
    echo -e "${RED}✗${NC} OPENAI_API_KEY missing"
fi

if grep -q "GEMINI_API_KEY=" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} GEMINI_API_KEY configured"
    ((ENV_OK++))
else
    echo -e "${RED}✗${NC} GEMINI_API_KEY missing"
fi

if grep -q "DATABASE_URL=" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} DATABASE_URL configured"
    ((ENV_OK++))
else
    echo -e "${YELLOW}⚠️${NC}  DATABASE_URL not set (will use default)"
fi

echo ""
echo "Environment variables: $ENV_OK/2 required"
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}📊 Summary${NC}"
echo "=========================================="
echo ""

TOTAL_SCORE=$((SERVICES_OK + ADAPTERS_OK + BACKEND_DEPS + FRONTEND_DEPS + DB_OK + ENV_OK))
MAX_SCORE=15

echo "Overall Status: $TOTAL_SCORE/$MAX_SCORE"
echo ""

if [ $SERVICES_OK -eq 4 ] && [ $ADAPTERS_OK -eq 4 ]; then
    echo -e "${GREEN}✅ Services and Adapters: SYNCED${NC}"
else
    echo -e "${RED}❌ Services and Adapters: NOT SYNCED${NC}"
fi

if [ $BACKEND_DEPS -eq 1 ] && [ $FRONTEND_DEPS -eq 1 ]; then
    echo -e "${GREEN}✅ Dependencies: INSTALLED${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencies: INCOMPLETE${NC}"
fi

if [ $ENV_OK -ge 2 ]; then
    echo -e "${GREEN}✅ Environment: CONFIGURED${NC}"
else
    echo -e "${RED}❌ Environment: INCOMPLETE${NC}"
fi

echo ""

# Recommendations
if [ $TOTAL_SCORE -lt $MAX_SCORE ]; then
    echo -e "${YELLOW}📝 Recommendations:${NC}"
    echo ""
    
    if [ $SERVICES_OK -lt 4 ]; then
        echo "  • Start missing services:"
        echo "    ./fix-all-services.sh"
        echo "    ./start-openvoice-now.sh"
    fi
    
    if [ $ADAPTERS_OK -lt 4 ]; then
        echo "  • Adapter ports have been fixed"
        echo "    Restart backend to apply changes"
    fi
    
    if [ $BACKEND_DEPS -eq 0 ]; then
        echo "  • Install backend dependencies:"
        echo "    cd packages/backend && npm install"
    fi
    
    if [ $FRONTEND_DEPS -eq 0 ]; then
        echo "  • Install frontend dependencies:"
        echo "    cd packages/frontend && npm install"
    fi
    
    if [ $DB_OK -eq 0 ]; then
        echo "  • Setup database:"
        echo "    cd packages/backend && npx prisma migrate dev"
    fi
    
    if [ $ENV_OK -lt 2 ]; then
        echo "  • Configure environment variables in packages/backend/.env"
    fi
    
    echo ""
fi

# Final status
echo "=========================================="
if [ $SERVICES_OK -eq 4 ] && [ $ADAPTERS_OK -eq 4 ] && [ $ENV_OK -ge 2 ]; then
    echo -e "${GREEN}✅ SYSTEM READY FOR FULL PIPELINE${NC}"
    echo "=========================================="
    echo ""
    echo "Start the system:"
    echo "  cd packages/backend && npm run dev &"
    echo "  cd packages/frontend && npm run dev &"
    echo "  open http://localhost:3000"
else
    echo -e "${YELLOW}⚠️  SYSTEM NEEDS CONFIGURATION${NC}"
    echo "=========================================="
    echo ""
    echo "Follow recommendations above"
fi
echo ""
