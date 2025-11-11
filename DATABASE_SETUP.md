# Database Setup Guide

## Issue

The backend requires PostgreSQL but it's not running.

```
Error: P1001: Can't reach database server at `localhost:5432`
```

---

## Solution Options

### Option 1: Use Docker (Recommended - Easiest)

**Start PostgreSQL with Docker:**

```bash
./start-database.sh
```

This will:
- Start PostgreSQL in a Docker container
- Create the `dubbing_platform` database
- Configure it on port 5432
- Keep data persistent

**Then run migrations:**

```bash
cd packages/backend
npx prisma migrate dev
```

### Option 2: Install PostgreSQL Locally

**On macOS:**

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb dubbing_platform

# Run migrations
cd packages/backend
npx prisma migrate dev
```

**On Linux:**

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb dubbing_platform

# Run migrations
cd packages/backend
npx prisma migrate dev
```

---

## Why PostgreSQL?

The Prisma schema uses features that require PostgreSQL:

1. **JSON fields** - Used for storing complex data structures
2. **Advanced queries** - Better performance for complex operations
3. **Production-ready** - Same database in dev and production

### JSON Fields in Schema

```prisma
model ContextMap {
  content Json  // Requires PostgreSQL
}

model AdaptationMetrics {
  validationFailureReasons Json  // Requires PostgreSQL
}

model SyncQualityMetrics {
  segmentAccuracy Json  // Requires PostgreSQL
}
```

---

## Quick Start

### 1. Start Database

```bash
# Option A: Docker (easiest)
./start-database.sh

# Option B: Local PostgreSQL
brew services start postgresql@14
```

### 2. Run Migrations

```bash
cd packages/backend
npx prisma migrate dev
```

### 3. Start Backend

```bash
cd packages/backend
npm run dev
```

### 4. Start Frontend

```bash
cd packages/frontend
npm run dev
```

### 5. Open Browser

```bash
open http://localhost:3000
```

---

## Database Configuration

### Connection String

```
postgresql://postgres:postgres@localhost:5432/dubbing_platform
```

### Environment Variable

In `packages/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
```

---

## Troubleshooting

### Docker Not Running

```bash
# Start Docker Desktop
open -a Docker

# Wait for Docker to start, then:
./start-database.sh
```

### Port 5432 Already in Use

```bash
# Check what's using the port
lsof -i :5432

# Stop existing PostgreSQL
brew services stop postgresql@14

# Or kill the process
kill $(lsof -ti:5432)
```

### Connection Refused

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Or for local install
brew services list | grep postgresql

# Restart if needed
./start-database.sh
```

### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
cd packages/backend
npx prisma migrate reset

# Or create fresh migration
npx prisma migrate dev --name init
```

---

## Database Management

### View Database

```bash
# Using Prisma Studio
cd packages/backend
npx prisma studio

# Opens at http://localhost:5555
```

### Connect with psql

```bash
# Docker
docker exec -it dubbing-postgres psql -U postgres -d dubbing_platform

# Local
psql -U postgres -d dubbing_platform
```

### Backup Database

```bash
# Docker
docker exec dubbing-postgres pg_dump -U postgres dubbing_platform > backup.sql

# Local
pg_dump -U postgres dubbing_platform > backup.sql
```

### Restore Database

```bash
# Docker
docker exec -i dubbing-postgres psql -U postgres dubbing_platform < backup.sql

# Local
psql -U postgres dubbing_platform < backup.sql
```

---

## Stop Database

### Docker

```bash
docker stop dubbing-postgres
```

### Local

```bash
brew services stop postgresql@14
```

---

## Summary

**Easiest Setup:**

```bash
# 1. Start database
./start-database.sh

# 2. Run migrations
cd packages/backend && npx prisma migrate dev

# 3. Start backend
npm run dev

# 4. Start frontend (new terminal)
cd packages/frontend && npm run dev

# 5. Open browser
open http://localhost:3000
```

---

**Status:** Database setup script created ✅  
**Recommended:** Use Docker with `./start-database.sh`  
**Alternative:** Install PostgreSQL locally
