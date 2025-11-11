# Database Migration Guide

This guide explains how to work with database migrations in the AI Video Dubbing Platform.

## Quick Start

### First Time Setup

1. **Start Docker services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run the automated setup:**
   ```bash
   cd packages/backend
   npm run db:setup
   ```

   This will:
   - Generate Prisma Client
   - Create and apply migrations
   - Seed the database with test data

### Manual Setup

If you prefer to run steps individually:

```bash
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Create and apply migration
npm run prisma:migrate

# 3. Seed database
npm run prisma:seed
```

## Working with Migrations

### Creating a New Migration

When you modify the Prisma schema:

```bash
npm run prisma:migrate
```

This will:
1. Prompt you for a migration name
2. Generate SQL migration files
3. Apply the migration to your database
4. Regenerate Prisma Client

### Applying Migrations in Production

```bash
npm run prisma:migrate:deploy
```

This applies pending migrations without prompting for names or creating new ones.

### Pushing Schema Changes (Development Only)

For rapid prototyping without creating migrations:

```bash
npm run db:push
```

⚠️ **Warning:** This bypasses migration history. Use only in development.

### Resetting the Database

To completely reset your database (deletes all data):

```bash
npm run db:reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed scripts

## Migration Files

Migrations are stored in `packages/backend/prisma/migrations/`.

Each migration folder contains:
- `migration.sql` - The SQL commands to apply
- Timestamp prefix for ordering

### Example Migration Structure

```
prisma/migrations/
├── 20241102000000_init/
│   └── migration.sql
├── 20241102120000_add_glossary/
│   └── migration.sql
└── migration_lock.toml
```

## Common Scenarios

### Adding a New Table

1. Add the model to `schema.prisma`:
   ```prisma
   model NewTable {
     id        String   @id @default(uuid())
     name      String
     createdAt DateTime @default(now())
   }
   ```

2. Create migration:
   ```bash
   npm run prisma:migrate
   # Enter name: add_new_table
   ```

### Adding a Column

1. Update the model in `schema.prisma`:
   ```prisma
   model User {
     id    String @id
     email String
     phone String? // New optional column
   }
   ```

2. Create migration:
   ```bash
   npm run prisma:migrate
   # Enter name: add_user_phone
   ```

### Renaming a Column

Use the `@map` directive to avoid data loss:

```prisma
model User {
  id           String @id
  emailAddress String @map("email") // Renames column in DB
}
```

### Adding an Index

```prisma
model Project {
  id     String @id
  userId String
  status String

  @@index([userId])
  @@index([status])
}
```

## Connection Pooling Configuration

### Default Configuration

Prisma automatically manages connection pooling with sensible defaults:
- Pool size: `(num_physical_cpus * 2) + 1`
- Connection timeout: 10 seconds
- Pool timeout: 10 seconds

### Custom Configuration

Add parameters to your `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=20"
```

Available parameters:
- `connection_limit` - Maximum number of connections
- `pool_timeout` - Time to wait for available connection (seconds)
- `connect_timeout` - Time to wait for initial connection (seconds)

### Production Recommendations

For production environments:

```env
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=20&connect_timeout=10&schema=public&sslmode=require"
```

## Query Optimization

### Using Indexes

The schema includes indexes on frequently queried fields:

```prisma
model Project {
  userId String
  status String

  @@index([userId])      // Fast user project lookups
  @@index([status])      // Fast status filtering
}
```

### Composite Indexes

For queries filtering on multiple fields:

```prisma
model Job {
  projectId String
  stage     String
  status    String

  @@index([projectId, stage])  // Fast project stage lookups
}
```

### Using Select and Include

Optimize queries by selecting only needed fields:

```typescript
// ❌ Fetches all fields
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// ✅ Fetches only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    subscriptionTier: true,
  }
});
```

### Batch Operations

Use batch operations for better performance:

```typescript
// ❌ Multiple queries
for (const project of projects) {
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'COMPLETED' }
  });
}

// ✅ Single batch query
await prisma.project.updateMany({
  where: {
    id: { in: projects.map(p => p.id) }
  },
  data: { status: 'COMPLETED' }
});
```

## Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:

```bash
# 1. Check migration status
npx prisma migrate status

# 2. Mark problematic migration as applied (if already applied manually)
npx prisma migrate resolve --applied "20241102000000_migration_name"

# 3. Or mark as rolled back
npx prisma migrate resolve --rolled-back "20241102000000_migration_name"
```

### Connection Issues

Test database connectivity:

```bash
# Using psql
psql -h localhost -U postgres -d dubbing_platform

# Using Prisma
npx prisma db pull
```

### Schema Drift

If your database schema doesn't match Prisma schema:

```bash
# Pull current database schema
npx prisma db pull

# Or reset to match Prisma schema
npm run db:reset
```

### Performance Issues

Enable query logging to identify slow queries:

```typescript
// In prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

Then analyze slow queries:

```sql
-- In PostgreSQL
EXPLAIN ANALYZE SELECT * FROM projects WHERE user_id = 'xxx';
```

## Best Practices

1. **Always create migrations** - Don't use `db push` in production
2. **Test migrations** - Apply to staging before production
3. **Use transactions** - For operations that must succeed or fail together
4. **Add indexes** - On foreign keys and frequently queried fields
5. **Use connection pooling** - Configure appropriate pool size
6. **Monitor queries** - Enable logging in development
7. **Backup before migrations** - Always backup production data
8. **Version control migrations** - Commit migration files to git

## Useful Commands Reference

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:migrate:deploy

# View database in browser
npm run prisma:studio

# Seed database
npm run prisma:seed

# Push schema without migration
npm run db:push

# Reset database
npm run db:reset

# Full setup
npm run db:setup

# Check migration status
npx prisma migrate status

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from database
npx prisma db pull
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Connection Pooling Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)


## Automated Migration Scripts

### Migration Script

Use the migration script for safe, automated migrations:

```bash
# Deploy migrations
./scripts/migrate.sh deploy

# Check migration status
./scripts/migrate.sh status

# Create new migration
./scripts/migrate.sh create migration_name

# Validate migrations
./scripts/migrate.sh validate

# Reset database (DANGEROUS)
./scripts/migrate.sh reset
```

### Test Migration Script

Test migrations in an isolated environment before applying to production:

```bash
# Test migration in temporary database
./scripts/test-migration.sh
```

This script:
- Creates a temporary test database
- Copies current schema
- Applies pending migrations
- Validates the result
- Cleans up automatically

### Backup Script

Create database backups before migrations:

```bash
# Create local backup
./scripts/backup-db.sh

# Create backup and upload to S3
S3_BACKUP_BUCKET=dubbing-platform-backups ./scripts/backup-db.sh
```

Backups are stored in `packages/backend/backups/` and optionally uploaded to S3.

## CI/CD Migration Automation

### GitHub Actions Workflows

#### Automated Migration (CI/CD Pipeline)

Migrations are automatically applied during deployment:

**Staging** (on merge to `develop`):
1. Tests run with migrated schema
2. Migrations applied to staging database
3. Health checks verify success

**Production** (on merge to `main`):
1. Backup created automatically
2. Migrations run in Kubernetes job
3. Deployment waits for migration success
4. Automatic rollback on failure

#### Manual Migration Workflow

For complex migrations, use the manual workflow:

```bash
# Go to: GitHub Actions > Database Migration > Run workflow
# Select:
#   - environment: staging or production
#   - action: deploy, status, or rollback
```

### Migration Safety Checklist

Before applying migrations to production:

- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Test migration script run successfully
- [ ] Database backup created
- [ ] Migration SQL reviewed
- [ ] Rollback plan documented
- [ ] Team notified of migration window
- [ ] Monitoring dashboards open
- [ ] On-call engineer available

## Advanced Migration Scenarios

### Data Migrations

For migrations that modify data:

```typescript
// scripts/data-migrations/backfill-user-preferences.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { preferences: null }
  });
  
  console.log(`Backfilling preferences for ${users.length} users`);
  
  // Batch process for better performance
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await prisma.$transaction(
      batch.map(user =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            preferences: {
              theme: 'light',
              notifications: true
            }
          }
        })
      )
    );
    
    console.log(`Processed ${Math.min(i + batchSize, users.length)}/${users.length}`);
  }
  
  console.log('Backfill complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run data migration:
```bash
npx tsx scripts/data-migrations/backfill-user-preferences.ts
```

### Multi-Step Migrations

For breaking changes, use multi-step migrations:

**Step 1**: Add new column (nullable)
```prisma
model Video {
  id       String @id
  videoUrl String  // Old column
  videoPath String? // New column
}
```

**Step 2**: Backfill data
```bash
npx tsx scripts/data-migrations/copy-video-url-to-path.ts
```

**Step 3**: Make new column required, remove old
```prisma
model Video {
  id        String @id
  videoPath String  // Now required, old column removed
}
```

### Large Table Migrations

For tables with millions of rows:

```sql
-- Use CONCURRENTLY for index creation (no table lock)
CREATE INDEX CONCURRENTLY "idx_projects_user_id" ON "Project"("userId");

-- Batch updates to avoid long-running transactions
DO $$
DECLARE
  batch_size INTEGER := 1000;
  offset_val INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  LOOP
    UPDATE "User"
    SET "updatedAt" = NOW()
    WHERE id IN (
      SELECT id FROM "User"
      WHERE "updatedAt" IS NULL
      LIMIT batch_size
      OFFSET offset_val
    );
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    
    offset_val := offset_val + batch_size;
    RAISE NOTICE 'Updated % rows', offset_val;
    
    -- Small delay to avoid overwhelming the database
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline automatically rolls back deployments if migrations fail.

### Manual Rollback Options

#### Option 1: Restore from Backup

```bash
# List available backups
ls -lh packages/backend/backups/
# Or from S3
aws s3 ls s3://dubbing-platform-backups/postgres/

# Restore backup
gunzip < backups/dubbing_prod_20241104-120000.sql.gz | \
  psql $DATABASE_URL
```

#### Option 2: Create Reverse Migration

```bash
# Create reverse migration SQL
cat > reverse_migration.sql << 'EOF'
-- Reverse the changes from failed migration
ALTER TABLE "User" DROP COLUMN "newColumn";
DROP INDEX IF EXISTS "User_email_idx";
EOF

# Apply reverse migration
psql $DATABASE_URL < reverse_migration.sql

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back XXXXXX_failed_migration
```

#### Option 3: Point-in-Time Recovery (for managed databases)

For AWS RDS:
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier dubbing-platform-prod \
  --target-db-instance-identifier dubbing-platform-prod-restored \
  --restore-time 2024-11-04T10:00:00Z
```

### Post-Rollback Steps

1. Verify database state: `npm run prisma:migrate status`
2. Revert application code to previous version
3. Create incident report
4. Plan fix migration

## Monitoring Migrations

### During Migration

Monitor these metrics:
- Database CPU and memory usage
- Active connections
- Lock wait times
- Query execution times
- Application error rates

### After Migration

- Verify schema matches expected state
- Check application logs for errors
- Monitor query performance
- Verify data integrity
- Check for N+1 queries with new schema

### Query Performance Monitoring

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Emergency Procedures

### Production Migration Failure

1. **Immediate Actions**:
   - Stop deployment
   - Assess impact
   - Check application health
   - Review error logs

2. **Decision Tree**:
   - **If application is down**: Rollback immediately
   - **If application is degraded**: Assess if rollback or forward fix is better
   - **If application is healthy**: Monitor and plan fix

3. **Communication**:
   - Notify team in #production-incidents
   - Update status page
   - Inform stakeholders

4. **Resolution**:
   - Execute rollback or fix
   - Verify system health
   - Document incident
   - Plan prevention measures

### Manual Migration in Kubernetes

If automated migration fails:

```bash
# Connect to database from Kubernetes
kubectl run psql-client --rm -i --tty \
  --image=postgres:16 \
  --restart=Never \
  -n production \
  -- psql $DATABASE_URL

# Check current state
\dt  -- List tables
\d "TableName"  -- Describe table

# Apply migration SQL manually
\i /path/to/migration.sql

# Mark migration as applied
npx prisma migrate resolve --applied XXXXXX_migration_name
```

## Migration Best Practices Summary

1. **Always test migrations** in development and staging first
2. **Create backups** before production migrations
3. **Use the test-migration script** to validate in isolation
4. **Review generated SQL** before applying
5. **Plan for rollback** scenarios
6. **Communicate** with team before production migrations
7. **Monitor** during and after migrations
8. **Use concurrent operations** for large tables
9. **Batch data updates** to avoid long transactions
10. **Document** complex migrations and rollback procedures

## Additional Resources

- [Deployment Runbook](../../.github/DEPLOYMENT_RUNBOOK.md)
- [Production Environment Setup](../../k8s/environments/production/README.md)
- [Staging Environment Setup](../../k8s/environments/staging/README.md)
- [Prisma Migration Best Practices](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
