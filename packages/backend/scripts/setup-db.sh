#!/bin/bash

# Database Setup Script for AI Video Dubbing Platform
# This script initializes the database, runs migrations, and seeds data

set -e

echo "🚀 Setting up database for AI Video Dubbing Platform..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec dubbing-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL failed to start within the expected time."
    exit 1
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Run migrations
echo "📊 Running database migrations..."
npm run prisma:migrate

# Seed database
echo "🌱 Seeding database with development data..."
npm run prisma:seed

echo ""
echo "✨ Database setup complete!"
echo ""
echo "📝 Test user credentials (password: password123):"
echo "   - Free Tier: free@example.com"
echo "   - Creator Tier: creator@example.com"
echo "   - Pro Tier: pro@example.com"
echo ""
echo "🎨 To view the database, run: npm run prisma:studio"
echo ""
