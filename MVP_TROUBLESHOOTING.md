# MVP Prototype - Troubleshooting Guide

Common issues and their solutions when running the MVP prototype.

## 🚨 Quick Fixes

### "Port already in use" error

**Symptoms:**
- Error: `EADDRINUSE: address already in use :::3000`
- Error: `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or stop all services and restart
./mvp-stop.sh
./mvp-start.sh
```

### Database connection failed

**Symptoms:**
- Error: `Can't reach database server`
- Error: `Connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Wait a few seconds, then test
docker exec -it dubbing-postgres psql -U postgres -c "SELECT 1"

# If still failing, reset database
docker-compose down -v
docker-compose up -d postgres redis
sleep 10
cd packages/backend && npm run db:push
```

### Redis connection failed

**Symptoms:**
- Error: `Redis connection refused`
- Worker not processing jobs

**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker-compose up -d redis

# Test connection
docker exec -it dubbing-redis redis-cli ping
# Should return: PONG

# If failing, restart Redis
docker-compose restart redis
```

### "Module not found" error

**Symptoms:**
- Error: `Cannot find module '@prisma/client'`
- Error: `Cannot find module 'xyz'`

**Solution:**
```bash
# Regenerate Prisma client
cd packages/backend
npm run prisma:generate

# If still failing, reinstall dependencies
cd ../..
rm -rf node_modules packages/*/node_modules
npm install

# Then regenerate Prisma client again
cd packages/backend
npm run prisma:generate
```

### "404 Not Found" during npm install

**Symptoms:**
- Error: `404 Not Found - GET https://registry.npmjs.org/package-name`
- Error: `The requested resource could not be found`

**Solution:**
```bash
# This usually means a package.json has an invalid dependency
# The startup script should handle this automatically
# If you see this, try running the script again:
./mvp-start.sh

# If it persists, clean and reinstall:
rm -rf node_modules packages/*/node_modules package-lock.json
npm install
```

### Services won't start

**Symptoms:**
- `npm run dev` fails immediately
- Services crash on startup

**Solution:**
```bash
# 1. Check prerequisites
node --version    # Should be v20+
docker --version  # Should be installed
npm --version     # Should be v9+

# 2. Check Docker is running
docker ps

# 3. Stop everything and start fresh
./mvp-stop.sh
docker-compose down -v

# 4. Start again
./mvp-start.sh
```

## 🔍 Diagnostic Steps

### Step 1: Check Prerequisites

```bash
# Verify Node.js version
node --version
# Expected: v20.x.x or higher

# Verify npm version
npm --version
# Expected: 9.x.x or higher

# Verify Docker is running
docker ps
# Should show running containers or empty list (not error)

# Verify Docker Compose
docker-compose --version
# Should show version number
```

### Step 2: Check Services

```bash
# Check what's running
docker ps

# Should see:
# - dubbing-postgres
# - dubbing-redis

# Check service health
docker-compose ps

# Check logs for errors
docker-compose logs postgres
docker-compose logs redis
```

### Step 3: Check Ports

```bash
# Check if required ports are available
lsof -i :3000    # Frontend
lsof -i :3001    # Backend
lsof -i :5432    # PostgreSQL
lsof -i :6379    # Redis

# If any show results, those ports are in use
# Kill the processes or change ports in .env files
```

### Step 4: Check Environment Files

```bash
# Verify .env files exist
ls -la packages/backend/.env
ls -la packages/frontend/.env.local
ls -la packages/workers/.env

# If missing, run:
./mvp-start.sh
# It will create them automatically
```

### Step 5: Check Database

```bash
# Connect to database
docker exec -it dubbing-postgres psql -U postgres -d dubbing_platform

# List tables
\dt

# Should see:
# - User
# - DubbingJob
# - _prisma_migrations

# Exit
\q

# If tables are missing, push schema
cd packages/backend
npm run db:push
```

## 🐛 Specific Error Messages

### "Prisma Client not generated"

```bash
cd packages/backend
npm run prisma:generate
cd ../..
```

### "Database does not exist"

```bash
docker exec -it dubbing-postgres psql -U postgres -c "CREATE DATABASE dubbing_platform;"
cd packages/backend
npm run db:push
```

### "JWT_SECRET is not defined"

```bash
# Check .env file exists
cat packages/backend/.env

# If missing JWT_SECRET, add it:
echo "JWT_SECRET=mvp-dev-secret-change-in-production" >> packages/backend/.env
```

### "Cannot connect to Redis"

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it dubbing-redis redis-cli ping

# If not running
docker-compose up -d redis
```

### "ENOSPC: System limit for number of file watchers reached"

This happens on Linux systems.

```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### "Permission denied" when running scripts

```bash
# Make scripts executable
chmod +x mvp-start.sh
chmod +x mvp-stop.sh
chmod +x mvp-reset.sh
```

## 🎯 Problem-Specific Solutions

### Frontend shows "Cannot connect to API"

**Check:**
1. Backend is running on port 3001
2. NEXT_PUBLIC_API_URL is set correctly in `packages/frontend/.env.local`
3. CORS is configured correctly

**Solution:**
```bash
# Check backend is running
curl http://localhost:3001/health

# If not responding, check backend logs
# Look for errors in the terminal running npm run dev

# Verify environment variable
cat packages/frontend/.env.local
# Should contain: NEXT_PUBLIC_API_URL=http://localhost:3001

# Restart frontend
# Press Ctrl+C and run: npm run dev
```

### Video upload fails

**Check:**
1. File size is under 100MB
2. File format is MP4
3. Upload directory exists and is writable

**Solution:**
```bash
# Create upload directory
mkdir -p packages/backend/uploads

# Check permissions
ls -la packages/backend/uploads

# If permission denied, fix it
chmod 755 packages/backend/uploads

# Check disk space
df -h
```

### Worker not processing jobs

**Check:**
1. Redis is running
2. Worker is connected to Redis
3. No errors in worker logs

**Solution:**
```bash
# Check Redis
docker exec -it dubbing-redis redis-cli ping

# Check queue has jobs
docker exec -it dubbing-redis redis-cli KEYS "*"

# Check worker logs
# Look for errors in terminal running npm run dev

# Restart worker
# Press Ctrl+C and run: npm run dev
```

### Job stuck at 0% progress

**Check:**
1. Worker is running
2. No errors in worker logs
3. Redis connection is working

**Solution:**
```bash
# Check worker is running
# Should see worker logs in terminal

# Check Redis connection
docker exec -it dubbing-redis redis-cli ping

# Check job queue
docker exec -it dubbing-redis redis-cli LLEN bull:dubbing:waiting

# If jobs are stuck, restart worker
# Press Ctrl+C and run: npm run dev
```

### Download link shows 404

**Check:**
1. Job is completed
2. Output file exists
3. File hasn't expired (24 hours)

**Solution:**
```bash
# Check if output file exists
ls -la packages/backend/uploads/output/

# Check job status in database
cd packages/backend
npm run prisma:studio
# Open DubbingJob table and check status

# If file is missing but job is complete, re-run the job
```

## 🔄 Reset Strategies

### Soft Reset (Keep code, clear data)

```bash
./mvp-reset.sh
```

This will:
- Stop all services
- Delete database data
- Clear uploaded files
- Reinitialize database
- Keep your code and dependencies

### Medium Reset (Clear dependencies)

```bash
docker-compose down -v
rm -rf node_modules packages/*/node_modules
npm install
./mvp-start.sh
```

This will:
- Everything from soft reset
- Reinstall all npm packages
- Regenerate Prisma client

### Hard Reset (Nuclear option)

```bash
docker-compose down -v
rm -rf node_modules packages/*/node_modules
rm -rf packages/backend/uploads/*
rm -rf packages/backend/temp/*
rm -rf packages/backend/.env
rm -rf packages/frontend/.env.local
rm -rf packages/workers/.env
rm -rf packages/backend/dist
rm -rf packages/workers/dist
npm install
./mvp-start.sh
```

This will:
- Everything from medium reset
- Delete all environment files
- Delete all build artifacts
- Start completely fresh

## 📊 Health Checks

### Quick Health Check

```bash
# Check all services
echo "=== Docker Services ==="
docker ps

echo -e "\n=== Backend Health ==="
curl http://localhost:3001/health

echo -e "\n=== Frontend ==="
curl -I http://localhost:3000

echo -e "\n=== Database ==="
docker exec -it dubbing-postgres psql -U postgres -c "SELECT 1"

echo -e "\n=== Redis ==="
docker exec -it dubbing-redis redis-cli ping
```

### Detailed Health Check

```bash
# Run comprehensive checks
./mvp-start.sh --check-only

# Or manually:
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Docker: $(docker --version)"
echo ""
echo "Services:"
docker-compose ps
echo ""
echo "Ports:"
lsof -i :3000 -i :3001 -i :5432 -i :6379
```

## 🆘 Getting Help

If you're still stuck after trying these solutions:

1. **Check the logs:**
   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   # Backend/frontend/worker logs are in the terminal
   ```

2. **Check the documentation:**
   - [MVP_README.md](./MVP_README.md) - Main documentation
   - [MVP_COMMANDS.md](./MVP_COMMANDS.md) - Command reference

3. **Try a fresh start:**
   ```bash
   ./mvp-reset.sh
   ```

4. **Check system resources:**
   ```bash
   # Check disk space
   df -h
   
   # Check memory
   free -h  # Linux
   vm_stat  # macOS
   
   # Check Docker resources
   docker stats
   ```

## 💡 Prevention Tips

1. **Always use the startup script** for first-time setup
2. **Keep Docker running** before starting services
3. **Don't manually edit database** - use Prisma
4. **Check logs regularly** for early warning signs
5. **Run cleanup script** periodically to free disk space
6. **Use small test videos** during development
7. **Keep environment files** backed up

---

**Still having issues?** Try the nuclear reset option above or check the main README for more details.
