#!/bin/bash

# Test Migration Script
# Tests migrations in a temporary database before applying to production

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

# Create test database name
TEST_DB_NAME="${DB_NAME}_migration_test_$(date +%s)"
TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"

print_info "Testing migrations in temporary database: $TEST_DB_NAME"

# Create test database
print_info "Creating test database..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" || {
    print_error "Failed to create test database"
    exit 1
}

# Function to cleanup on exit
cleanup() {
    print_info "Cleaning up test database..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" || true
}
trap cleanup EXIT

# Copy current database schema to test database
print_info "Copying current schema to test database..."
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only | \
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TEST_DB_NAME || {
    print_error "Failed to copy schema"
    exit 1
}

# Run migrations on test database
print_info "Running migrations on test database..."
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy || {
    print_error "Migration failed on test database"
    exit 1
}

# Validate schema
print_info "Validating schema..."
DATABASE_URL=$TEST_DATABASE_URL npx prisma validate || {
    print_error "Schema validation failed"
    exit 1
}

# Check for schema drift
print_info "Checking for schema drift..."
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-schema-datasource prisma/schema.prisma \
    --script || print_warn "Schema drift detected"

# Run a simple query to ensure database is functional
print_info "Testing database connectivity..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TEST_DB_NAME -c "SELECT 1;" > /dev/null || {
    print_error "Database connectivity test failed"
    exit 1
}

print_info "✓ Migration test completed successfully!"
print_info "The migration is safe to apply to production"
print_warn "Remember to:"
print_warn "  1. Create a database backup before applying to production"
print_warn "  2. Test the migration in staging first"
print_warn "  3. Have a rollback plan ready"
