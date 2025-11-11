# Backend Scripts

This directory contains utility scripts for managing the backend application.

## Cleanup Scripts

### cleanup-expired-videos.ts

Removes expired dubbing jobs and their associated files to free up disk space.

**What it does:**
- Deletes completed jobs that have passed their expiration time (24 hours after completion)
- Deletes failed jobs older than 7 days
- Removes original video files, output files, and temporary directories
- Provides detailed logging and statistics

**Usage:**

```bash
# Run from the backend directory
npm run cleanup-expired

# Or run directly with tsx
tsx scripts/cleanup-expired-videos.ts
```

**Recommended Schedule:**

For production use, set up a cron job to run this script regularly:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/backend && npm run cleanup-expired >> /var/log/cleanup.log 2>&1
```

**Output:**

The script provides detailed output including:
- Number of jobs processed and deleted
- Number of files deleted
- Total disk space freed
- Any errors encountered

Example output:
```
=================================
Video Cleanup Script - MVP
=================================

Starting cleanup of expired dubbing jobs...
Current time: 2025-11-05T10:30:00.000Z
Found 5 expired jobs to clean up

Processing job abc123:
  Created: 2025-11-04T08:00:00.000Z
  Expired: 2025-11-05T08:00:00.000Z
  Deleted file: /path/to/original.mp4 (45.23 MB)
  Deleted file: /path/to/output.mp4 (42.15 MB)
  Deleted temp directory: /path/to/temp/abc123 (12.45 MB)
  Job abc123 cleaned up successfully

=== Cleanup Summary ===
Jobs processed: 5
Jobs deleted: 5
Files deleted: 15
Space freed: 523.45 MB
Errors: 0

Cleanup completed successfully!
```

## Other Scripts

### manage-beta.ts
Manage beta testing program users and invitations.

### beta-metrics.ts
Generate metrics and analytics for the beta testing program.

### feedback-analysis.ts
Analyze user feedback from the beta testing program.

### process-grace-periods.ts
Process subscription grace periods and handle payment failures.

## Database Scripts

### setup-db.sh
Set up the database for the first time.

### migrate.sh
Run database migrations.

### test-migration.sh
Test database migrations in a safe environment.

### backup-db.sh
Create a backup of the database.
