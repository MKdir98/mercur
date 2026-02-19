#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

print_step() {
    echo -e "${BLUE}▶${NC} ${1}"
}

if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run with sudo"
    exit 1
fi

MAILCOW_DIR="/opt/mailcow-dockerized"

if [ ! -d "$MAILCOW_DIR" ]; then
    print_error "Mailcow directory not found at $MAILCOW_DIR"
    exit 1
fi

cd "$MAILCOW_DIR"

print_step "Fixing Mailcow database initialization..."
echo ""

print_info "Stopping all containers..."
docker compose down

print_info "Removing database volume (will be recreated)..."
docker volume rm mailcow-dockerized_mysql-vol-1 2>/dev/null || true

print_info "Starting MySQL container first..."
docker compose up -d mysql-mailcow

print_info "Waiting for MySQL to initialize (60 seconds)..."
sleep 60

print_info "Checking MySQL status..."
docker compose exec -T mysql-mailcow mysqladmin ping -h localhost || {
    print_warning "MySQL not ready yet, waiting another 30 seconds..."
    sleep 30
}

print_success "MySQL is ready"

print_info "Starting all other containers..."
docker compose up -d

print_info "Waiting for services to initialize (30 seconds)..."
sleep 30

print_success "════════════════════════════════════════════════════════"
print_success "Database initialization completed!"
print_success "════════════════════════════════════════════════════════"
echo ""

print_info "Checking container status..."
docker compose ps

echo ""
print_info "If you still see errors, check logs:"
echo "  cd $MAILCOW_DIR"
echo "  docker compose logs -f sogo-mailcow"
echo ""
print_info "To verify database:"
echo "  docker compose exec mysql-mailcow mysql -u mailcow -p mailcow -e 'SHOW TABLES;'"
echo ""
