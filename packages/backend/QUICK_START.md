# Quick Start Guide - Database Setup

Get the database up and running in 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed
- npm or yarn installed

## Step 1: Start Services

```bash
# From project root
docker-compose up -d postgres redis
```

Wait for services to be healthy (~30 seconds).

## Step 2: Install Dependencies

```bash
cd packages/backend
npm install
```

## Step 3: Setup Database

### Option A: Automated Setup (Recommended)

```bash
npm run db:setup
```

This single command will:
- Generate Prisma Client
- Create and apply migrations
- Seed test data

### Option B: Manual Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

## Step 4: Verify Setup

```bash
# Start the backend server
npm run dev
```

Visit http://localhost:3001/health/db to verify database connection.

## Step 5: Explore Data

```bash
# Open Prisma Studio (database GUI)
npm run prisma:studio
```

Visit http://localhost:5555 to browse your data.

## Test Credentials

Use these credentials to test authentication:

| Email | Password | Tier |
|-------|----------|------|
| free@example.com | password123 | Free |
| creator@example.com | password123 | Creator |
| pro@example.com | password123 | Pro |

## Common Commands

```bash
# View database in browser
npm run prisma:studio

# Reset database (deletes all data)
npm run db:reset

# Create new migration
npm run prisma:migrate

# Seed database again
npm run prisma:seed

# Check migration status
npx prisma migrate status
```

## Troubleshooting

### Docker not running
```bash
# Check Docker status
docker ps

# Start Docker Desktop and try again
```

### Port already in use
```bash
# Check what's using port 5432
lsof -i :5432

# Stop conflicting service or change port in docker-compose.yml
```

### Connection refused
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs dubbing-postgres

# Restart container
docker-compose restart postgres
```

### Migration errors
```bash
# Reset everything
npm run db:reset

# Or manually
docker-compose down -v
docker-compose up -d postgres
npm run db:setup
```

## Next Steps

1. Read [DATABASE.md](./DATABASE.md) for detailed documentation
2. Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration workflows
3. Check [prisma/README.md](./prisma/README.md) for schema details
4. Start building your API endpoints!

## Project Structure

```
packages/backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed script
│   ├── migrations/            # Migration files
│   └── README.md              # Schema documentation
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   └── db-utils.ts        # Database utilities
│   ├── types/
│   │   └── database.ts        # Type definitions
│   └── index.ts               # API server
├── DATABASE.md                # Full documentation
├── MIGRATION_GUIDE.md         # Migration guide
└── QUICK_START.md            # This file
```

## Need Help?

- Check the [DATABASE.md](./DATABASE.md) for detailed docs
- Review [Prisma Documentation](https://www.prisma.io/docs)
- Check Docker logs: `docker logs dubbing-postgres`
- Check application logs in terminal

## Success Checklist

- [ ] Docker services running
- [ ] Dependencies installed
- [ ] Prisma Client generated
- [ ] Migrations applied
- [ ] Database seeded
- [ ] Backend server starts
- [ ] Health check returns OK
- [ ] Prisma Studio opens

If all items are checked, you're ready to develop! 🎉
