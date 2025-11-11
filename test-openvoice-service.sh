#!/bin/bash

# Test OpenVoice Service

echo "🧪 Testing OpenVoice V2 Service"
echo "================================"
echo ""

# Check if service is running
if lsof -Pi :8007 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Service is running on port 8007"
    echo ""
    
    echo "Testing health endpoint..."
    curl -s http://localhost:8007/health | python3 -m json.tool
    echo ""
    
    echo "Testing languages endpoint..."
    curl -s http://localhost:8007/languages | python3 -m json.tool
    echo ""
    
    echo "✅ All tests passed!"
else
    echo "❌ Service is not running on port 8007"
    echo ""
    echo "Start the service with:"
    echo "  cd packages/workers/docker/openvoice"
    echo "  ./start-openvoice.sh"
fi
