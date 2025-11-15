# Quick Start Guide

Get the platform running in 5 minutes.

## 1. Start Database & Redis

```bash
docker-compose -f docker-compose.simple.yml up -d
```

This starts PostgreSQL and Redis in Docker.

## 2. Setup Environment

```bash
./START_SIMPLE.sh
```

This will:
- Create .env files from examples
- Install dependencies
- Generate Prisma client
- Run database migrations

## 3. Configure API Keys

Edit `packages/backend/.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```

## 4. Start Services

Open 3 terminals:

**Terminal 1 - Backend**:
```bash
cd packages/backend
npm run dev
```

**Terminal 2 - Workers**:
```bash
cd packages/workers
npm run dev
```

**Terminal 3 - Frontend**:
```bash
cd packages/frontend
npm run dev
```

## 5. Use the App

1. Open http://localhost:3000
2. Sign up with email/password
3. Create a new project
4. Upload a video
5. Start dubbing

## Troubleshooting

**Port already in use**:
- Backend uses 3001
- Frontend uses 3000
- PostgreSQL uses 5432
- Redis uses 6379

**Database connection error**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://dubbing:dubbing123@localhost:5432/dubbing
```

**Redis connection error**:
```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

**Workers not processing**:
- Check OPENAI_API_KEY is set in packages/backend/.env
- Check Redis is running
- Check worker logs for errors

## Stop Services

```bash
# Stop Docker services
docker-compose -f docker-compose.simple.yml down

# Stop Node services
# Press Ctrl+C in each terminal
```

## Clean Start

```bash
# Remove all data and start fresh
docker-compose -f docker-compose.simple.yml down -v
./START_SIMPLE.sh
```
