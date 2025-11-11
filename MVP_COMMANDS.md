# MVP Prototype - Command Reference

Quick reference for common commands when working with the MVP prototype.

## 🚀 Getting Started

```bash
# First time setup and start
./mvp-start.sh

# Access the application
open http://localhost:3000
```

## 🎮 Service Control

```bash
# Start all services (after initial setup)
npm run dev

# Start individual services
npm run dev:backend      # Backend API only
npm run dev:frontend     # Frontend only
npm run dev:workers      # Workers only

# Stop all services
./mvp-stop.sh
# OR press Ctrl+C in the terminal running npm run dev

# Reset everything (deletes all data!)
./mvp-reset.sh
```

## 🐳 Docker Commands

```bash
# Start database and Redis
docker-compose up -d postgres redis

# Stop all containers
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs -f          # Follow all logs

# Check running containers
docker ps

# Restart a service
docker-compose restart postgres
docker-compose restart redis
```

## 💾 Database Commands

```bash
cd packages/backend

# View database in GUI
npm run prisma:studio

# Push schema changes (development)
npm run db:push

# Generate Prisma client
npm run prisma:generate

# Reset database (deletes all data!)
npm run db:reset

# Run cleanup script
npm run cleanup-expired
```

## 🧹 Cleanup Commands

```bash
# Clean up expired videos (manual)
cd packages/backend
npm run cleanup-expired

# Remove uploaded files
rm -rf packages/backend/uploads/*
rm -rf packages/backend/temp/*

# Clean node_modules (if needed)
rm -rf node_modules packages/*/node_modules
npm install
```

## 🔍 Debugging Commands

```bash
# Check if ports are in use
lsof -i :3000    # Frontend
lsof -i :3001    # Backend
lsof -i :5432    # PostgreSQL
lsof -i :6379    # Redis

# Kill process on a port
kill -9 $(lsof -ti:3000)

# Check Node.js version
node --version

# Check Docker status
docker --version
docker ps
docker-compose ps

# View backend logs
cd packages/backend
npm run dev      # Logs will appear in terminal

# Test database connection
docker exec -it dubbing-postgres psql -U postgres -d dubbing_platform
# Then run: \dt to list tables
# Exit with: \q
```

## 📦 Installation Commands

```bash
# Install all dependencies
npm install

# Install dependencies for specific package
cd packages/backend && npm install
cd packages/frontend && npm install
cd packages/workers && npm install

# Update dependencies
npm update
```

## 🧪 Testing Commands

```bash
cd packages/backend

# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development Workflow

### Starting a fresh development session
```bash
# 1. Start services
./mvp-start.sh

# 2. Open application
open http://localhost:3000

# 3. View logs in terminal
# Backend, frontend, and worker logs will appear
```

### Making code changes
```bash
# Services auto-reload on file changes
# Just edit files and save - no restart needed

# If auto-reload fails, restart services:
# Press Ctrl+C
npm run dev
```

### Resetting for testing
```bash
# Quick reset (keeps code, clears data)
./mvp-reset.sh

# Full reset (reinstall everything)
docker-compose down -v
rm -rf node_modules packages/*/node_modules
npm install
./mvp-start.sh
```

## 🐛 Common Issues

### Port already in use
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or stop all services
./mvp-stop.sh
```

### Database connection failed
```bash
# Restart database
docker-compose restart postgres

# Or reset database
docker-compose down -v
docker-compose up -d postgres redis
cd packages/backend && npm run db:push
```

### Module not found
```bash
# Regenerate Prisma client
cd packages/backend
npm run prisma:generate

# Or reinstall dependencies
cd ../..
rm -rf node_modules packages/*/node_modules
npm install
```

### Worker not processing jobs
```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis

# Check worker logs
# Look for errors in the terminal running npm run dev
```

## 📊 Monitoring

```bash
# Watch database in real-time
cd packages/backend
npm run prisma:studio
# Opens at http://localhost:5555

# Monitor Docker resources
docker stats

# Check disk usage
du -sh packages/backend/uploads
du -sh packages/backend/temp
```

## 🔐 Environment Variables

### Backend (.env location: `packages/backend/.env`)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=mvp-dev-secret-change-in-production
API_PORT=3001
```

### Frontend (.env location: `packages/frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Workers (.env location: `packages/workers/.env`)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=1
```

## 📝 Quick Tips

1. **Always start with `./mvp-start.sh`** for first-time setup
2. **Use `npm run dev`** for subsequent starts
3. **Press Ctrl+C** to stop all services
4. **Check Docker first** if services won't start
5. **Use `./mvp-reset.sh`** if things get messy
6. **Keep terminal open** to see logs in real-time
7. **Test with small videos** (30-60 seconds) for faster iteration

## 🆘 Emergency Reset

If everything is broken and you want to start fresh:

```bash
# Nuclear option - resets everything
docker-compose down -v
rm -rf node_modules packages/*/node_modules
rm -rf packages/backend/uploads/*
rm -rf packages/backend/temp/*
rm -rf packages/backend/.env
rm -rf packages/frontend/.env.local
rm -rf packages/workers/.env
npm install
./mvp-start.sh
```

---

**Need help?** Check the [MVP_README.md](./MVP_README.md) for detailed documentation.
