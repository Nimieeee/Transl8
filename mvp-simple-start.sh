#!/bin/bash

echo "🚀 Starting AI Video Dubbing MVP (No Auth)"
echo "=========================================="
echo ""

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
if ! docker ps | grep -q dubbing-postgres; then
    echo "❌ PostgreSQL container not running. Starting..."
    docker-compose up -d
    sleep 5
else
    echo "✅ Docker containers are running"
fi

echo ""
echo "🔧 Starting Backend Server..."
cd packages/backend
npm run dev &
BACKEND_PID=$!

echo ""
echo "🎨 Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "✅ MVP is starting!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
