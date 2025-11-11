#!/bin/bash

# Database Backup Script
# Creates a backup of the database before migrations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract database connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Backup directory
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
mkdir -p "$BACKUP_DIR"

# Backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

print_info "Creating database backup..."
print_info "Database: $DB_NAME"
print_info "Backup file: $BACKUP_FILE"

# Create backup
PGPASSWORD=$DB_PASS pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE" || {
    print_error "Backup failed"
    exit 1
}

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

print_info "✓ Backup created successfully"
print_info "Backup size: $BACKUP_SIZE"
print_info "Backup location: $BACKUP_FILE"

# Upload to S3 if configured
if [ -n "$S3_BACKUP_BUCKET" ]; then
    print_info "Uploading backup to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/postgres/" || {
        print_warn "Failed to upload to S3, but local backup is available"
    }
    print_info "✓ Backup uploaded to S3"
fi

# Clean up old backups (keep last 7 days)
print_info "Cleaning up old backups..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete || true

print_info "✓ Backup process complete"
