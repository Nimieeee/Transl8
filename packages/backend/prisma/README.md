# Database Schema and Prisma Setup

This directory contains the Prisma schema, migrations, and seed scripts for the AI Video Dubbing Platform.

## Schema Overview

The database schema includes the following tables:

- **users**: User accounts with subscription tiers and usage tracking
- **projects**: Video dubbing projects with status and configuration
- **transcripts**: Speech-to-text transcriptions with speaker diarization
- **translations**: Machine-translated content with editing support
- **voice_clones**: User-created voice clones for TTS
- **jobs**: Processing pipeline job tracking
- **glossary**: Custom translation terms

## Setup Instructions

### 1. Start the Database

Using Docker Compose (recommended):
```bash
docker-compose up -d postgres
```

Or use a local PostgreSQL instance and update the `DATABASE_URL` in `.env`.

### 2. Generate Prisma Client

```bash
cd packages/backend
npm run prisma:generate
```

### 3. Run Migrations

For development:
```bash
npm run prisma:migrate
```

For production:
```bash
npm run prisma:migrate:deploy
```

### 4. Seed Development Data

```bash
npm run prisma:seed
```

This creates:
- 3 test users (free, creator, pro tiers)
- Sample projects in various states
- Transcripts and translations
- Voice clones
- Processing jobs
- Glossary entries

### Test User Credentials

All test users have the password: `password123`

- **Free Tier**: free@example.com
- **Creator Tier**: creator@example.com
- **Pro Tier**: pro@example.com

## Common Commands

### View Database in Prisma Studio
```bash
npm run prisma:studio
```

### Push Schema Changes (without migrations)
```bash
npm run db:push
```

### Reset Database (WARNING: Deletes all data)
```bash
npm run db:reset
```

### Create a New Migration
```bash
npx prisma migrate dev --name your_migration_name
```

## Connection Pooling

Prisma automatically manages connection pooling. The default pool size is calculated as:
```
pool_size = (num_physical_cpus * 2) + 1
```

To override, add `connection_limit` to your DATABASE_URL:
```
postgresql://user:password@localhost:5432/db?connection_limit=10
```

## Performance Optimization

The schema includes several optimizations:

1. **Indexes**: Added on frequently queried fields (userId, status, stage)
2. **Cascade Deletes**: Automatic cleanup of related records
3. **JSON Fields**: Flexible storage for complex data structures
4. **Unique Constraints**: Prevent duplicate entries

## Schema Relationships

```
User
├── Projects (1:N)
└── VoiceClones (1:N)

Project
├── Transcripts (1:1)
├── Translations (1:N)
└── Jobs (1:N)
```

## Migration Strategy

- **Development**: Use `prisma migrate dev` to create and apply migrations
- **Production**: Use `prisma migrate deploy` to apply pending migrations
- **Schema Changes**: Always create migrations, never use `db push` in production

## Troubleshooting

### Connection Issues
```bash
# Test database connection
psql -h localhost -U postgres -d dubbing_platform

# Check if Prisma can connect
npx prisma db pull
```

### Migration Conflicts
```bash
# Reset migrations (development only)
npm run db:reset

# Mark migration as applied without running
npx prisma migrate resolve --applied <migration_name>
```

### Performance Issues
```bash
# Analyze query performance
EXPLAIN ANALYZE <your_query>

# Check connection pool status
SELECT * FROM pg_stat_activity;
```
