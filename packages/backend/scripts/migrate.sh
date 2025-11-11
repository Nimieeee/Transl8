#!/bin/bash

# Database Migration Script
# Handles Prisma migrations with safety checks and rollback support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Parse command
COMMAND=${1:-"deploy"}

case $COMMAND in
    "deploy")
        print_info "Deploying database migrations..."
        
        # Check migration status first
        print_info "Checking current migration status..."
        npx prisma migrate status || true
        
        # Confirm before proceeding
        read -p "Proceed with migration deployment? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_warn "Migration cancelled"
            exit 0
        fi
        
        # Deploy migrations
        print_info "Deploying migrations..."
        npx prisma migrate deploy
        
        print_info "✓ Migrations deployed successfully"
        ;;
        
    "status")
        print_info "Checking migration status..."
        npx prisma migrate status
        ;;
        
    "create")
        MIGRATION_NAME=${2:-"migration"}
        print_info "Creating new migration: $MIGRATION_NAME"
        
        # Generate migration
        npx prisma migrate dev --name "$MIGRATION_NAME" --create-only
        
        print_info "✓ Migration created. Review the SQL before applying."
        print_warn "Remember to test this migration in a development environment first!"
        ;;
        
    "reset")
        print_error "⚠️  WARNING: This will reset the database and lose all data!"
        read -p "Are you absolutely sure? (type 'RESET' to confirm): " confirm
        if [ "$confirm" != "RESET" ]; then
            print_warn "Reset cancelled"
            exit 0
        fi
        
        print_info "Resetting database..."
        npx prisma migrate reset --force
        
        print_info "✓ Database reset complete"
        ;;
        
    "validate")
        print_info "Validating migrations..."
        
        # Check for drift
        print_info "Checking for schema drift..."
        npx prisma migrate diff \
            --from-schema-datamodel prisma/schema.prisma \
            --to-schema-datasource prisma/schema.prisma \
            --script || print_warn "Schema drift detected"
        
        # Validate migration history
        print_info "Validating migration history..."
        npx prisma migrate status
        
        print_info "✓ Validation complete"
        ;;
        
    "rollback")
        print_error "⚠️  Prisma doesn't support automatic rollback"
        print_info "To rollback a migration:"
        print_info "1. Create a new migration that reverses the changes"
        print_info "2. Or restore from a database backup"
        print_info "3. See MIGRATION_GUIDE.md for detailed procedures"
        exit 1
        ;;
        
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Deploy pending migrations (default)"
        echo "  status    - Check migration status"
        echo "  create    - Create a new migration"
        echo "  validate  - Validate migrations and check for drift"
        echo "  reset     - Reset database (DANGEROUS)"
        echo "  rollback  - Show rollback instructions"
        exit 1
        ;;
esac
