#!/bin/bash

# Transl8 - Deployment Script
# This script helps deploy the application to Vercel and Render

set -e

echo "🚀 Transl8 - Deployment Helper"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_tools() {
    echo -e "${BLUE}Checking required tools...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All required tools are installed${NC}"
    echo ""
}

# Install dependencies
install_deps() {
    echo -e "${BLUE}Installing dependencies...${NC}"
    
    # Backend
    echo "📦 Installing backend dependencies..."
    cd packages/backend && npm install && cd ../..
    
    # Workers
    echo "📦 Installing workers dependencies..."
    cd packages/workers && npm install && cd ../..
    
    # Frontend
    echo "📦 Installing frontend dependencies..."
    cd packages/frontend && npm install && cd ../..
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
}

# Build projects
build_projects() {
    echo -e "${BLUE}Building projects...${NC}"
    
    # Backend
    echo "🔨 Building backend..."
    cd packages/backend && npm run build && cd ../..
    
    # Workers
    echo "🔨 Building workers..."
    cd packages/workers && npm run build && cd ../..
    
    # Frontend
    echo "🔨 Building frontend..."
    cd packages/frontend && npm run build && cd ../..
    
    echo -e "${GREEN}✅ Projects built successfully${NC}"
    echo ""
}

# Deploy frontend to Vercel
deploy_frontend() {
    echo -e "${BLUE}Deploying frontend to Vercel...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI not installed. Installing...${NC}"
        npm install -g vercel
    fi
    
    cd packages/frontend
    
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    cd ../..
    
    echo -e "${GREEN}✅ Frontend deployed to Vercel${NC}"
    echo ""
}

# Show deployment checklist
show_checklist() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}📋 Deployment Checklist${NC}"
    echo "=================================================="
    echo ""
    echo "Backend/Workers (Render):"
    echo "  1. Create Render account at https://render.com"
    echo "  2. Connect your GitHub repository"
    echo "  3. Create Web Service for backend"
    echo "  4. Set environment variables (see .env.example)"
    echo "  5. Deploy!"
    echo ""
    echo "Database (Supabase):"
    echo "  1. Create Supabase project at https://supabase.com"
    echo "  2. Copy DATABASE_URL from Settings → Database"
    echo "  3. Run: cd packages/backend && npx prisma migrate deploy"
    echo ""
    echo "Redis (Upstash):"
    echo "  1. Create Redis database at https://upstash.com"
    echo "  2. Copy REDIS_URL"
    echo ""
    echo "Frontend (Vercel):"
    echo "  1. Set NEXT_PUBLIC_API_URL to your Render backend URL"
    echo "  2. Deploy with: npm run deploy:frontend"
    echo ""
    echo "=================================================="
    echo ""
}

# Main menu
main_menu() {
    echo "What would you like to do?"
    echo ""
    echo "1) Install dependencies"
    echo "2) Build all projects"
    echo "3) Deploy frontend to Vercel"
    echo "4) Show deployment checklist"
    echo "5) Do everything (install + build + deploy)"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice [1-6]: " choice
    
    case $choice in
        1)
            check_tools
            install_deps
            ;;
        2)
            check_tools
            build_projects
            ;;
        3)
            check_tools
            deploy_frontend
            ;;
        4)
            show_checklist
            ;;
        5)
            check_tools
            install_deps
            build_projects
            deploy_frontend
            show_checklist
            ;;
        6)
            echo "Goodbye! 👋"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            main_menu
            ;;
    esac
}

# Run main menu
main_menu
