#!/bin/bash

echo "🧪 Testing XTTS v2 Integration"
echo "=============================="
echo ""

# Check if XTTS v2 is running
echo "1️⃣ Checking XTTS v2 service..."
if curl -s http://localhost:8008/health > /dev/null 2>&1; then
    echo "✅ XTTS v2 is running"
    curl -s http://localhost:8008/health | python3 -m json.tool
else
    echo "❌ XTTS v2 is not running"
    echo "   Start it with: ./START_XTTS.sh"
    exit 1
fi

echo ""
echo "2️⃣ Checking worker configuration..."
if grep -q "XTTS_SERVICE_URL=http://localhost:8008" packages/workers/.env; then
    echo "✅ Worker configured for XTTS v2"
else
    echo "❌ Worker not configured for XTTS v2"
    exit 1
fi

echo ""
echo "3️⃣ Checking TypeScript compilation..."
cd packages/workers
if npm run build > /dev/null 2>&1; then
    echo "✅ Worker compiles successfully"
else
    echo "❌ Worker has compilation errors"
    npm run build
    exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 Ready to use XTTS v2 for dubbing"
echo ""
echo "Next steps:"
echo "  1. Start worker: cd packages/workers && npm run dev"
echo "  2. Test full system: ./test-full-system.sh"
