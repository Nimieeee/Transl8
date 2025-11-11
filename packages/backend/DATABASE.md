# Database Implementation Documentation

## Overview

The AI Video Dubbing Platform uses PostgreSQL as its primary database with Prisma ORM for type-safe database access. This document provides a comprehensive overview of the database implementation.

## Architecture

### Technology Stack

- **Database**: PostgreSQL 15
- **ORM**: Prisma 5.x
- **Connection Pooling**: Built-in Prisma connection pooling
- **Migrations**: Prisma Migrate
- **Type Safety**: Full TypeScript integration

### Database Schema

The schema consists of 7 main tables:

1. **users** - User accounts and subscription management
2. **projects** - Video dubbing projects
3. **transcripts** - Speech-to-text transcriptions
4. **translations** - Machine translations
5. **voice_clones** - User-created voice clones
6. **jobs** - Processing pipeline job tracking
7. **glossary** - Custom translation terms

## Schema Details

### Users Table

Stores user accounts with subscription tier and usage tracking.

```typescript
{
  id: UUID (PK)
  email: String (unique)
  passwordHash: String
  subscriptionTier: Enum (FREE, CREATOR, PRO, ENTERPRISE)
  processingMinutesUsed: Integer
  processingMinutesLimit: Integer
  voiceCloneSlots: Integer
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Relationships:**
- One-to-Many with Projects
- One-to-Many with VoiceClones

**Indexes:**
- Primary key on `id`
- Unique index on `email`

### Projects Table

Stores video dubbing projects with configuration and status.

```typescript
{
  id: UUID (PK)
  userId: UUID (FK -> users.id)
  name: String
  status: Enum (UPLOADING, PROCESSING, REVIEW, COMPLETED, FAILED)
  sourceLanguage: String
  targetLanguage: String
  videoUrl: String?
  audioUrl: String?
  outputVideoUrl: String?
  duration: Integer?
  thumbnailUrl: String?
  voiceConfig: JSON?
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Relationships:**
- Many-to-One with User
- One-to-One with Transcript
- One-to-Many with Translations
- One-to-Many with Jobs

**Indexes:**
- Primary key on `id`
- Index on `userId`
- Index on `status`

### Transcripts Table

Stores speech-to-text transcriptions with speaker diarization.

```typescript
{
  id: UUID (PK)
  projectId: UUID (FK -> projects.id, unique)
  content: JSON
  editedContent: JSON?
  approved: Boolean
  confidence: Float?
  speakerCount: Integer?
  createdAt: DateTime
  updatedAt: DateTime
}
```

**JSON Structure (content):**
```json
{
  "text": "Full transcript text",
  "duration": 125.5,
  "language": "en",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Segment text",
      "speaker": "SPEAKER_00",
      "confidence": 0.95,
      "words": [...]
    }
  ]
}
```

**Relationships:**
- One-to-One with Project

**Indexes:**
- Primary key on `id`
- Unique index on `projectId`

### Translations Table

Stores machine translations with editing support.

```typescript
{
  id: UUID (PK)
  projectId: UUID (FK -> projects.id)
  targetLanguage: String
  content: JSON
  editedContent: JSON?
  approved: Boolean
  glossaryApplied: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

**JSON Structure (content):**
```json
{
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Translated text",
      "speaker": "SPEAKER_00",
      "sourceText": "Original text"
    }
  ]
}
```

**Relationships:**
- Many-to-One with Project

**Indexes:**
- Primary key on `id`
- Unique index on `(projectId, targetLanguage)`
- Index on `projectId`

### Voice Clones Table

Stores user-created voice clones for TTS.

```typescript
{
  id: UUID (PK)
  userId: UUID (FK -> users.id)
  name: String
  sampleAudioUrl: String
  modelData: JSON
  language: String?
  quality: Float?
  createdAt: DateTime
}
```

**JSON Structure (modelData):**
```json
{
  "embeddings": [0.1, 0.2, 0.3, ...],
  "modelVersion": "xtts-v2",
  "sampleDuration": 8.5
}
```

**Relationships:**
- Many-to-One with User

**Indexes:**
- Primary key on `id`
- Index on `userId`

### Jobs Table

Tracks processing pipeline jobs for each stage.

```typescript
{
  id: UUID (PK)
  projectId: UUID (FK -> projects.id)
  stage: Enum (STT, MT, TTS, MUXING, LIPSYNC)
  status: Enum (PENDING, PROCESSING, COMPLETED, FAILED)
  progress: Integer (0-100)
  errorMessage: String?
  metadata: JSON?
  retryCount: Integer
  startedAt: DateTime?
  completedAt: DateTime?
  createdAt: DateTime
}
```

**Relationships:**
- Many-to-One with Project

**Indexes:**
- Primary key on `id`
- Index on `projectId`
- Index on `status`
- Index on `stage`

### Glossary Table

Stores custom translation terms.

```typescript
{
  id: UUID (PK)
  userId: UUID (FK -> users.id)
  sourceLanguage: String
  targetLanguage: String
  sourceTerm: String
  targetTerm: String
  createdAt: DateTime
}
```

**Indexes:**
- Primary key on `id`
- Unique index on `(userId, sourceLanguage, targetLanguage, sourceTerm)`
- Index on `userId`

## Connection Management

### Connection Pooling

Prisma automatically manages connection pooling with the following defaults:

- **Pool Size**: `(num_physical_cpus * 2) + 1`
- **Connection Timeout**: 10 seconds
- **Pool Timeout**: 10 seconds

### Custom Configuration

Configure via `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=20&connect_timeout=10"
```

### Production Settings

Recommended production configuration:

```env
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=20&connect_timeout=10&schema=public&sslmode=require"
```

## Query Optimization

### Indexes

Strategic indexes are placed on:
- Foreign keys (`userId`, `projectId`)
- Status fields for filtering
- Unique constraints for data integrity

### Query Best Practices

1. **Use Select**: Only fetch needed fields
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, email: true }
   });
   ```

2. **Batch Operations**: Use `findMany` instead of loops
   ```typescript
   const projects = await prisma.project.findMany({
     where: { userId: { in: userIds } }
   });
   ```

3. **Transactions**: Group related operations
   ```typescript
   await prisma.$transaction([
     prisma.project.update(...),
     prisma.job.create(...)
   ]);
   ```

## Utility Functions

### Database Utilities (`src/lib/db-utils.ts`)

- `withRetry()` - Retry failed operations
- `executeTransaction()` - Execute transactional operations
- `paginate()` - Paginate query results
- `getDatabaseStats()` - Get database statistics
- `checkProcessingLimit()` - Check user quota
- `updateProcessingMinutes()` - Update usage tracking
- `formatPrismaError()` - Format errors for users

### Type Definitions (`src/types/database.ts`)

- Full TypeScript types for all models
- Helper types for API requests/responses
- Subscription tier limits configuration
- Pipeline stage helpers

## Development Workflow

### Initial Setup

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations
npm run prisma:migrate

# 4. Seed database
npm run prisma:seed
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate
# 3. Enter migration name
# 4. Migration is applied automatically
```

### Viewing Data

```bash
# Open Prisma Studio
npm run prisma:studio
```

## Testing

### Test Data

The seed script creates:
- 3 test users (free, creator, pro)
- 3 sample projects
- 2 transcripts
- 2 translations
- 3 voice clones
- 5 jobs
- 3 glossary entries

### Test Credentials

All test users have password: `password123`

- free@example.com (Free tier)
- creator@example.com (Creator tier)
- pro@example.com (Pro tier)

## Monitoring

### Health Checks

```bash
# API health check
curl http://localhost:3001/health

# Database health check
curl http://localhost:3001/health/db
```

### Query Logging

Enable in development:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Performance Monitoring

Use PostgreSQL's built-in tools:

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check connection pool
SELECT * FROM pg_stat_activity;
```

## Security

### Password Hashing

- Algorithm: bcrypt
- Cost factor: 12
- Implemented in auth service

### SQL Injection Prevention

- Prisma automatically parameterizes queries
- No raw SQL in application code
- Use `prisma.$queryRaw` with caution

### Data Encryption

- Passwords: bcrypt hashed
- Database: PostgreSQL encryption at rest
- Transit: TLS/SSL connections

## Backup and Recovery

### Backup Strategy

```bash
# Manual backup
pg_dump -h localhost -U postgres dubbing_platform > backup.sql

# Restore
psql -h localhost -U postgres dubbing_platform < backup.sql
```

### Automated Backups

Configure in production:
- Daily full backups
- Point-in-time recovery
- Retention: 30 days

## Troubleshooting

### Common Issues

1. **Connection refused**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL

2. **Migration conflicts**
   - Use `prisma migrate status`
   - Resolve with `prisma migrate resolve`

3. **Schema drift**
   - Pull current schema: `prisma db pull`
   - Or reset: `npm run db:reset`

### Debug Mode

Enable detailed logging:

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

## Future Enhancements

Potential improvements:

1. **Read Replicas**: For scaling read operations
2. **Caching Layer**: Redis for frequently accessed data
3. **Soft Deletes**: Add `deletedAt` field for recovery
4. **Audit Logs**: Track all data modifications
5. **Partitioning**: For large tables (jobs, projects)
6. **Full-Text Search**: PostgreSQL FTS for transcripts

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Prisma Schema Reference](./prisma/README.md)
