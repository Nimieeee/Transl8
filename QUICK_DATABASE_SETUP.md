# Quick Database Setup

## The Issue
Your database isn't running, so migrations can't be applied.

## Solution: Start Just the Database

Instead of starting all services (which requires GPU for AI models), let's start just what you need for development:

### Option 1: Start Only Database & Redis (Recommended for Development)

```bash
# Start only PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait a few seconds for database to be ready
sleep 5

# Now run migrations
cd packages/backend
npm run prisma:migrate:deploy

# Generate Prisma client (already done, but run again to be sure)
npm run prisma:generate
```

### Option 2: Use Existing PostgreSQL Installation

If you have PostgreSQL installed locally:

```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@15

# Or if using Postgres.app, just open it

# Create database
createdb dubbing_platform

# Update .env to use local database
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform

# Run migrations
cd packages/backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

## After Database is Running

### 1. Apply Migrations
```bash
cd packages/backend
npm run prisma:migrate:deploy
```

### 2. Add Admin Email
```bash
# Edit packages/backend/.env
echo "ADMIN_EMAILS=your-email@example.com" >> .env
```

### 3. Start Backend (Development Mode)
```bash
cd packages/backend
npm run dev
```

### 4. Start Frontend (New Terminal)
```bash
cd packages/frontend
npm run dev
```

## Verify Setup

### Check Database Connection
```bash
cd packages/backend
npm run prisma:studio
```

This opens Prisma Studio at http://localhost:5555 where you can view your database.

### Test API
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

## What's Next?

Once database is running and migrations are applied:

1. ✅ Register a user at http://localhost:3000/register
2. ✅ Test GDPR features in settings
3. ✅ View legal documents at /legal/*
4. ✅ See cookie consent banner

## Troubleshooting

### "Port 5432 already in use"
```bash
# Check what's using port 5432
lsof -i :5432

# If it's another PostgreSQL instance, either:
# 1. Use that instance (update DATABASE_URL in .env)
# 2. Stop it: brew services stop postgresql
# 3. Use different port in docker-compose.yml
```

### "Can't connect to database"
```bash
# Check if container is running
docker ps | grep postgres

# Check container logs
docker logs dubbing-postgres

# Restart container
docker-compose restart postgres
```

### "Migration failed"
```bash
# Reset database (WARNING: deletes all data)
cd packages/backend
npm run db:reset

# Or manually
docker-compose down -v  # Removes volumes
docker-compose up -d postgres redis
npm run prisma:migrate:deploy
```

## Current Status

✅ All code implemented  
✅ Migrations created  
✅ Prisma client generated  
⏳ Database needs to be started  
⏳ Migrations need to be applied  

After completing the steps above, your compliance features will be fully functional!
