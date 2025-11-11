#!/bin/bash

echo "🎬 AI Video Dubbing MVP - No Auth Version"
echo "=========================================="
echo ""

# Check Docker
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if containers are running
if ! docker ps | grep -q dubbing-postgres; then
    echo "📦 Starting Docker containers..."
    docker-compose up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 5
else
    echo "✅ Docker containers are running"
fi

echo ""
echo "🚀 Starting services..."
echo ""

# Kill any existing processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start backend in background
echo "🔧 Starting Backend (port 3001)..."
cd packages/backend
npm run dev > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait a bit for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting Frontend (port 3000)..."
cd packages/frontend
npm run dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo "=========================================="
echo "✅ MVP is starting!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:3001"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop: ./STOP_MVP.sh"
echo "=========================================="
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
if lsof -i:3001 > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start. Check backend.log"
fi

if lsof -i:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend failed to start. Check frontend.log"
fi

echo ""
echo "🎉 Open http://localhost:3000 in your browser!"
