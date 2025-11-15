#!/bin/bash

# Transl8 Database Migration Script
# This script runs Prisma migrations against your production database

set -e  # Exit on error

echo "🗄️  Transl8 Database Migration Script"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it with your Supabase connection string:"
    echo "export DATABASE_URL='postgresql://postgres:PASSWORD@HOST:5432/postgres'"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL is set"
echo ""

# Navigate to backend directory
cd packages/backend

echo "📦 Installing dependencies..."
npm install --silent

echo ""
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migrations completed successfully!"
echo ""
echo "Your database now has all the required tables:"
echo "  - users"
echo "  - projects"
echo "  - dubbing_jobs"
echo "  - transcripts"
echo "  - and more..."
echo ""
echo "🎉 Your Transl8 platform is ready to use!"
