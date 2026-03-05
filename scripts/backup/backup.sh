#!/bin/bash
# ============================================================================
# CITARION Backup Script
# Stage 4.6 - Automated Backup System
# ============================================================================

set -e

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/citarion_$DATE"
S3_BUCKET="${S3_BUCKET:-s3://citarion-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-citarion}"
DB_USER="${DB_USER:-citarion}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

backup_postgresql() {
    log_info "Starting PostgreSQL backup..."
    
    mkdir -p "$BACKUP_DIR/postgres"
    
    # Full database dump
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        -f "$BACKUP_DIR/postgres/database_$DATE.dump"
    
    # SQL dump for readability
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        > "$BACKUP_DIR/postgres/database_$DATE.sql"
    
    # Schema only
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        > "$BACKUP_DIR/postgres/schema_$DATE.sql"
    
    # Compress
    gzip "$BACKUP_DIR/postgres/database_$DATE.dump"
    gzip "$BACKUP_DIR/postgres/database_$DATE.sql"
    gzip "$BACKUP_DIR/postgres/schema_$DATE.sql"
    
    log_info "PostgreSQL backup completed"
}

backup_redis() {
    log_info "Starting Redis backup..."
    
    mkdir -p "$BACKUP_DIR/redis"
    
    # Trigger Redis BGSAVE
    redis-cli BGSAVE
    
    # Wait for save to complete
    sleep 5
    
    # Copy RDB file
    cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis/redis_$DATE.rdb"
    
    # Export keys (optional, for specific data)
    redis-cli --rdb "$BACKUP_DIR/redis/redis_export_$DATE.rdb"
    
    log_info "Redis backup completed"
}

backup_timescaledb() {
    log_info "Starting TimescaleDB backup..."
    
    mkdir -p "$BACKUP_DIR/timescaledb"
    
    # Backup hypertables
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT * FROM timescaledb_information.hypertables;
    " > "$BACKUP_DIR/timescaledb/hypertables_$DATE.txt"
    
    # Backup continuous aggregates
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT * FROM timescaledb_information.continuous_aggregates;
    " > "$BACKUP_DIR/timescaledb/continuous_aggregates_$DATE.txt"
    
    log_info "TimescaleDB backup completed"
}

backup_prisma() {
    log_info "Starting Prisma schema backup..."
    
    mkdir -p "$BACKUP_DIR/prisma"
    
    cp prisma/schema.prisma "$BACKUP_DIR/prisma/schema_$DATE.prisma"
    
    if [ -f "prisma/schema.postgresql.prisma" ]; then
        cp prisma/schema.postgresql.prisma "$BACKUP_DIR/prisma/"
    fi
    
    log_info "Prisma schema backup completed"
}

backup_config() {
    log_info "Starting configuration backup..."
    
    mkdir -p "$BACKUP_DIR/config"
    
    # Environment files (encrypted)
    if [ -f ".env" ]; then
        openssl enc -aes-256-gcm -salt -pbkdf2 -in .env -out "$BACKUP_DIR/config/.env.enc" -pass pass:"$BACKUP_ENCRYPTION_KEY"
    fi
    
    if [ -f ".env.production" ]; then
        openssl enc -aes-256-gcm -salt -pbkdf2 -in .env.production -out "$BACKUP_DIR/config/.env.production.enc" -pass pass:"$BACKUP_ENCRYPTION_KEY"
    fi
    
    # Docker compose files
    cp docker-compose.yml "$BACKUP_DIR/config/" 2>/dev/null || true
    cp docker-compose.prod.yml "$BACKUP_DIR/config/" 2>/dev/null || true
    
    # Custom configurations
    cp -r config "$BACKUP_DIR/config/" 2>/dev/null || true
    
    log_info "Configuration backup completed"
}

backup_logs() {
    log_info "Starting logs backup..."
    
    mkdir -p "$BACKUP_DIR/logs"
    
    # Copy recent logs
    if [ -d "logs" ]; then
        find logs -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/logs/" \;
    fi
    
    # Compress
    tar -czf "$BACKUP_DIR/logs.tar.gz" -C "$BACKUP_DIR" logs
    rm -rf "$BACKUP_DIR/logs"
    
    log_info "Logs backup completed"
}

# ============================================================================
# CLOUD UPLOAD
# ============================================================================

upload_to_s3() {
    log_info "Uploading backup to S3..."
    
    # Create archive
    tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
    
    # Upload to S3
    aws s3 cp "$BACKUP_DIR.tar.gz" "$S3_BUCKET/$(basename $BACKUP_DIR).tar.gz" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$DATE,retention-days=$RETENTION_DAYS"
    
    # Upload manifest
    cat > "$BACKUP_DIR/manifest.json" << EOF
{
    "date": "$DATE",
    "version": "$(git describe --tags --always 2>/dev/null || echo 'unknown')",
    "components": ["postgres", "redis", "timescaledb", "prisma", "config"],
    "size": "$(du -sh $BACKUP_DIR | cut -f1)",
    "checksum": "$(sha256sum $BACKUP_DIR.tar.gz | cut -d' ' -f1)"
}
EOF
    
    aws s3 cp "$BACKUP_DIR/manifest.json" "$S3_BUCKET/$(basename $BACKUP_DIR)/manifest.json"
    
    log_info "S3 upload completed"
}

# ============================================================================
# CLEANUP
# ============================================================================

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Local cleanup
    find /backups -type d -name "citarion_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;
    
    # S3 cleanup
    aws s3 ls "$S3_BUCKET/" | grep "citarion_" | while read -r line; do
        folder_date=$(echo "$line" | awk '{print $2}' | sed 's/citarion_//' | sed 's|/$||')
        folder_timestamp=$(date -d "${folder_date:0:8}" +%s 2>/dev/null || echo "0")
        retention_timestamp=$(date -d "-$RETENTION_DAYS days" +%s)
        
        if [ "$folder_timestamp" -lt "$retention_timestamp" ]; then
            aws s3 rm "$S3_BUCKET/citarion_$folder_date" --recursive
            log_info "Removed old backup: citarion_$folder_date"
        fi
    done
    
    log_info "Cleanup completed"
}

# ============================================================================
# VERIFICATION
# ============================================================================

verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Check PostgreSQL dump
    if [ -f "$BACKUP_DIR/postgres/database_$DATE.dump.gz" ]; then
        gunzip -t "$BACKUP_DIR/postgres/database_$DATE.dump.gz" && log_info "PostgreSQL dump verified"
    fi
    
    # Check Redis dump
    if [ -f "$BACKUP_DIR/redis/redis_$DATE.rdb" ]; then
        redis-check-rdb "$BACKUP_DIR/redis/redis_$DATE.rdb" && log_info "Redis dump verified"
    fi
    
    # Check archive
    if [ -f "$BACKUP_DIR.tar.gz" ]; then
        gzip -t "$BACKUP_DIR.tar.gz" && log_info "Archive verified"
    fi
    
    log_info "Backup verification completed"
}

# ============================================================================
# NOTIFICATION
# ============================================================================

send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"CITARION Backup - $status\",
                \"attachments\": [{
                    \"color\": \"$([ "$status" = "SUCCESS" ] && echo "good" || echo "danger")\",
                    \"fields\": [
                        {\"title\": \"Date\", \"value\": \"$DATE\", \"short\": true},
                        {\"title\": \"Size\", \"value\": \"$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)\", \"short\": true},
                        {\"title\": \"Message\", \"value\": \"$message\"}
                    ]
                }]
            }"
    fi
    
    # Telegram notification
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="🔄 *CITARION Backup*

*Status:* $status
*Date:* $DATE
*Message:* $message"
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "=========================================="
    log_info "CITARION Backup Started: $DATE"
    log_info "=========================================="
    
    START_TIME=$(date +%s)
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Run backups
    backup_postgresql || log_error "PostgreSQL backup failed"
    backup_redis || log_error "Redis backup failed"
    backup_timescaledb || log_error "TimescaleDB backup failed"
    backup_prisma || log_error "Prisma backup failed"
    backup_config || log_error "Config backup failed"
    backup_logs || log_error "Logs backup failed"
    
    # Upload to cloud
    upload_to_s3 || log_error "S3 upload failed"
    
    # Verify
    verify_backup || log_error "Verification failed"
    
    # Cleanup
    cleanup_old_backups || log_error "Cleanup failed"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log_info "=========================================="
    log_info "Backup completed in ${DURATION}s"
    log_info "=========================================="
    
    # Send success notification
    send_notification "SUCCESS" "Backup completed in ${DURATION}s"
}

# Run with error handling
trap 'send_notification "FAILED" "Backup failed at line $LINENO"' ERR
main "$@"
