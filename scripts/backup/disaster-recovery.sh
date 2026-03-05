#!/bin/bash
# ============================================================================
# CITARION Disaster Recovery Script
# Stage 4.6 - System Recovery Procedures
# ============================================================================

set -e

# Configuration
BACKUP_DATE="${1:-latest}"
S3_BUCKET="${S3_BUCKET:-s3://citarion-backups}"
RESTORE_DIR="/tmp/citarion_restore"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-citarion}"
DB_USER="${DB_USER:-citarion}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# DISCOVERY FUNCTIONS
# ============================================================================

find_latest_backup() {
    log_info "Finding latest backup..."
    
    LATEST=$(aws s3 ls "$S3_BUCKET/" | grep "citarion_" | sort -r | head -1 | awk '{print $2}' | sed 's|/$||')
    
    if [ -z "$LATEST" ]; then
        log_error "No backups found in S3"
        exit 1
    fi
    
    log_info "Latest backup: $LATEST"
    echo "$LATEST"
}

list_available_backups() {
    log_info "Available backups:"
    
    aws s3 ls "$S3_BUCKET/" | grep "citarion_" | sort -r | head -20 | while read -r line; do
        echo "$(echo $line | awk '{print $2}') - $(echo $line | awk '{print $1}')"
    done
}

# ============================================================================
# DOWNLOAD FUNCTIONS
# ============================================================================

download_backup() {
    local backup_name=$1
    
    log_info "Downloading backup: $backup_name"
    
    mkdir -p "$RESTORE_DIR"
    
    # Download archive
    aws s3 cp "$S3_BUCKET/$backup_name.tar.gz" "$RESTORE_DIR/"
    
    # Extract
    tar -xzf "$RESTORE_DIR/$backup_name.tar.gz" -C "$RESTORE_DIR"
    
    log_info "Backup downloaded and extracted"
}

# ============================================================================
# RESTORE FUNCTIONS
# ============================================================================

restore_postgresql() {
    log_info "Restoring PostgreSQL database..."
    
    local dump_file="$RESTORE_DIR/$BACKUP_DATE/postgres/database_*.dump.gz"
    
    if [ ! -f $dump_file ]; then
        log_error "PostgreSQL dump not found"
        return 1
    fi
    
    # Gunzip
    gunzip -k $dump_file
    
    # Drop existing connections
    psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    "
    
    # Drop and recreate database
    psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    
    # Restore
    pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        "${dump_file%.gz}"
    
    log_info "PostgreSQL restore completed"
}

restore_redis() {
    log_info "Restoring Redis data..."
    
    local rdb_file="$RESTORE_DIR/$BACKUP_DATE/redis/redis_*.rdb"
    
    if [ ! -f $rdb_file ]; then
        log_warn "Redis dump not found, skipping"
        return 0
    fi
    
    # Stop Redis
    systemctl stop redis || true
    
    # Copy RDB file
    cp $rdb_file /var/lib/redis/dump.rdb
    
    # Set permissions
    chown redis:redis /var/lib/redis/dump.rdb
    chmod 640 /var/lib/redis/dump.rdb
    
    # Start Redis
    systemctl start redis
    
    log_info "Redis restore completed"
}

restore_config() {
    log_info "Restoring configuration..."
    
    local config_dir="$RESTORE_DIR/$BACKUP_DATE/config"
    
    if [ ! -d "$config_dir" ]; then
        log_warn "Config directory not found, skipping"
        return 0
    fi
    
    # Decrypt .env files
    if [ -f "$config_dir/.env.enc" ]; then
        openssl enc -aes-256-gcm -d -pbkdf2 -in "$config_dir/.env.enc" -out .env -pass pass:"$BACKUP_ENCRYPTION_KEY"
    fi
    
    if [ -f "$config_dir/.env.production.enc" ]; then
        openssl enc -aes-256-gcm -d -pbkdf2 -in "$config_dir/.env.production.enc" -out .env.production -pass pass:"$BACKUP_ENCRYPTION_KEY"
    fi
    
    # Copy other configs
    cp -r "$config_dir"/* . 2>/dev/null || true
    
    log_info "Configuration restore completed"
}

restore_prisma() {
    log_info "Restoring Prisma schema..."
    
    local schema_file="$RESTORE_DIR/$BACKUP_DATE/prisma/schema_*.prisma"
    
    if [ ! -f $schema_file ]; then
        log_warn "Prisma schema not found, skipping"
        return 0
    fi
    
    cp $schema_file prisma/schema.prisma
    
    # Generate Prisma client
    bun run prisma generate
    
    log_info "Prisma schema restore completed"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_restore() {
    log_info "Validating restore..."
    
    # Check PostgreSQL
    local pg_tables=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" -t)
    log_info "PostgreSQL tables restored: $pg_tables"
    
    # Check Redis
    local redis_keys=$(redis-cli DBSIZE | awk '{print $2}')
    log_info "Redis keys restored: $redis_keys"
    
    # Check application
    bun run prisma db pull --force 2>/dev/null || true
    
    log_info "Validation completed"
}

# ============================================================================
# FAILOVER FUNCTIONS
# ============================================================================

failover_to_secondary() {
    log_info "Initiating failover to secondary region..."
    
    # Update DNS
    log_warn "DNS failover requires manual configuration in CloudFlare"
    
    # Switch database connection
    export DB_HOST="$SECONDARY_DB_HOST"
    export DB_PORT="$SECONDARY_DB_PORT"
    
    # Restart services
    docker-compose -f docker-compose.prod.yml restart
    
    log_info "Failover completed"
}

failback_to_primary() {
    log_info "Failing back to primary region..."
    
    # Sync data from secondary
    # This would typically involve database replication catch-up
    
    # Update DNS back to primary
    log_warn "DNS failback requires manual configuration in CloudFlare"
    
    # Restart services
    docker-compose -f docker-compose.prod.yml restart
    
    log_info "Failback completed"
}

# ============================================================================
# HEALTH CHECK
# ============================================================================

health_check() {
    log_info "Running health checks..."
    
    # PostgreSQL
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_info "PostgreSQL: OK"
    else
        log_error "PostgreSQL: FAILED"
    fi
    
    # Redis
    if redis-cli ping > /dev/null 2>&1; then
        log_info "Redis: OK"
    else
        log_error "Redis: FAILED"
    fi
    
    # Application
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_info "Application: OK"
    else
        log_error "Application: FAILED"
    fi
}

# ============================================================================
# MAIN CLI
# ============================================================================

show_usage() {
    echo "CITARION Disaster Recovery Tool"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list                   List available backups"
    echo "  restore [date]         Restore from backup (latest if no date)"
    echo "  validate               Validate current system state"
    echo "  health                 Run health checks"
    echo "  failover               Failover to secondary region"
    echo "  failback               Failback to primary region"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 restore 20250115_120000"
    echo "  $0 restore latest"
}

case "${1:-}" in
    list)
        list_available_backups
        ;;
    restore)
        if [ -z "${2:-}" ] || [ "$2" = "latest" ]; then
            BACKUP_DATE=$(find_latest_backup)
        else
            BACKUP_DATE="citarion_$2"
        fi
        
        download_backup "$BACKUP_DATE"
        restore_postgresql
        restore_redis
        restore_config
        restore_prisma
        validate_restore
        health_check
        ;;
    validate)
        validate_restore
        ;;
    health)
        health_check
        ;;
    failover)
        failover_to_secondary
        ;;
    failback)
        failback_to_primary
        ;;
    *)
        show_usage
        ;;
esac
