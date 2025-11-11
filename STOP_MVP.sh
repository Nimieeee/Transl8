#!/bin/bash

echo "🛑 Stopping AI Video Dubbing MVP..."
echo ""

# Kill processes on ports 3000 and 3001
echo "Stopping Frontend (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "Stopping Backend (port 3001)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo ""
echo "✅ All services stopped"
echo ""
echo "💡 Docker containers are still running."
echo "   To stop them: docker-compose down"
