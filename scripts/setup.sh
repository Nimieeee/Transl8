#!/bin/bash

set -e

echo "🚀 Setting up AI Video Dubbing Platform..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment files
echo "📝 Setting up environment files..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env"
fi

if [ ! -f packages/backend/.env ]; then
    cp packages/backend/.env.example packages/backend/.env
    echo "✅ Created packages/backend/.env"
fi

if [ ! -f packages/frontend/.env ]; then
    cp packages/frontend/.env.example packages/frontend/.env
    echo "✅ Created packages/frontend/.env"
fi

if [ ! -f packages/workers/.env ]; then
    cp packages/workers/.env.example packages/workers/.env
    echo "✅ Created packages/workers/.env"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis minio

echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review and update .env files with your configuration"
echo "  2. Run 'npm run dev' to start all services"
echo "  3. Access the application:"
echo "     - Frontend: http://localhost:3000"
echo "     - Backend API: http://localhost:3001"
echo "     - MinIO Console: http://localhost:9001"
echo ""
