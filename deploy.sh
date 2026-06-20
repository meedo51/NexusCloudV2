#!/bin/bash

# NexusCloud Auto-Deployment Script
# Location: /opt/nexuscloud/deploy.sh

set -e  # Exit on error

# Configuration
REPO_DIR="/opt/nexuscloud"  # Change to your actual directory
LOG_FILE="/var/log/nexuscloud-deploy.log"
BACKUP_DIR="/opt/nexuscloud/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if deployment is needed
check_for_updates() {
    log_message "${YELLOW}Checking for updates...${NC}"
    cd "$REPO_DIR"
    
    # Fetch latest changes without merging
    git fetch origin main
    
    # Check if there are changes
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git rev-parse origin/main)
    
    if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
        log_message "${GREEN}No updates available${NC}"
        return 1
    else
        log_message "${YELLOW}Updates detected!${NC}"
        log_message "Local:  $LOCAL_HASH"
        log_message "Remote: $REMOTE_HASH"
        return 0
    fi
}

# Function to backup database
backup_database() {
    log_message "${YELLOW}Backing up database...${NC}"
    mkdir -p "$BACKUP_DIR"
    
    # Backup PostgreSQL
    docker exec nexuscloud-postgres pg_dump -U nexuscloud nexuscloud > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    if [ $? -eq 0 ]; then
        log_message "${GREEN}Database backup created: db_backup_$TIMESTAMP.sql${NC}"
        # Keep only last 5 backups
        ls -t "$BACKUP_DIR"/db_backup_*.sql | tail -n +6 | xargs -r rm
    else
        log_message "${RED}Database backup failed!${NC}"
        return 1
    fi
}

# Function to pull and deploy
pull_and_deploy() {
    log_message "${YELLOW}Pulling latest changes...${NC}"
    cd "$REPO_DIR"
    
    # Pull changes
    git pull origin main
    
    if [ $? -ne 0 ]; then
        log_message "${RED}Git pull failed!${NC}"
        return 1
    fi
    
    # Update environment variables if needed (optional)
    # Copy .env.example to .env if needed
    
    log_message "${YELLOW}Rebuilding and restarting containers...${NC}"
    
    # Stop containers
    docker compose down
    
    # Rebuild without cache for fresh dependencies
    docker compose build --no-cache
    
    # Start containers
    docker compose up -d
    
    # Wait for containers to be healthy
    log_message "${YELLOW}Waiting for containers to start...${NC}"
    sleep 10
    
    # Check service health
    if curl -s http://localhost:5000/api/health | grep -q '"status":"ok"'; then
        log_message "${GREEN}Deployment successful!${NC}"
        return 0
    else
        log_message "${RED}Health check failed! Rolling back...${NC}"
        return 1
    fi
}

# Function to rollback
rollback() {
    log_message "${RED}Rolling back to previous version...${NC}"
    cd "$REPO_DIR"
    
    # Get previous commit
    git reset --hard HEAD~1
    
    # Rebuild and restart
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    
    log_message "${RED}Rollback complete. Please check manually.${NC}"
}

# Function to run migrations
run_migrations() {
    log_message "${YELLOW}Running database migrations...${NC}"
    docker exec nexuscloud-backend npm run db:migrate
    
    if [ $? -eq 0 ]; then
        log_message "${GREEN}Migrations completed successfully${NC}"
    else
        log_message "${RED}Migrations failed!${NC}"
        return 1
    fi
}

# Main deployment process
main() {
    log_message "${GREEN}=== Starting NexusCloud Auto-Deployment ===${NC}"
    
    # Check for updates
    if ! check_for_updates; then
        log_message "${GREEN}No deployment needed${NC}"
        exit 0
    fi
    
    # Backup before deployment
    if ! backup_database; then
        log_message "${RED}Deployment aborted due to backup failure${NC}"
        exit 1
    fi
    
    # Pull and deploy
    if ! pull_and_deploy; then
        log_message "${RED}Deployment failed! Performing rollback...${NC}"
        rollback
        exit 1
    fi
    
    # Run migrations
    run_migrations
    
    log_message "${GREEN}=== Auto-Deployment Completed Successfully ===${NC}"
}

# Run main function
main