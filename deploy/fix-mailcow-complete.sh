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

print_step "Complete Mailcow Fix - Resolving all issues..."
echo ""

# Step 1: Fix mailcow.conf for proxy issues
print_info "Step 1: Fixing mailcow.conf..."

if [ -f mailcow.conf ]; then
    # Disable proxy for internal containers
    if grep -q "^HTTP_PROXY=" mailcow.conf; then
        print_info "Commenting out proxy settings (causing issues with internal containers)..."
        sed -i 's/^HTTP_PROXY=/#HTTP_PROXY=/' mailcow.conf
        sed -i 's/^HTTPS_PROXY=/#HTTPS_PROXY=/' mailcow.conf
        sed -i 's/^NO_PROXY=/#NO_PROXY=/' mailcow.conf
    fi
    
    # Make sure SKIP_LETS_ENCRYPT is set
    if ! grep -q "^SKIP_LETS_ENCRYPT=y" mailcow.conf; then
        if grep -q "^SKIP_LETS_ENCRYPT=" mailcow.conf; then
            sed -i 's/^SKIP_LETS_ENCRYPT=.*/SKIP_LETS_ENCRYPT=y/' mailcow.conf
        else
            echo "SKIP_LETS_ENCRYPT=y" >> mailcow.conf
        fi
    fi
    
    print_success "mailcow.conf updated"
else
    print_error "mailcow.conf not found!"
    exit 1
fi

# Step 2: Stop everything
print_info "Step 2: Stopping all containers..."
docker compose down

# Step 3: Remove problematic volumes
print_info "Step 3: Removing database volume for fresh initialization..."
docker volume rm mailcow-dockerized_mysql-vol-1 2>/dev/null || print_warning "Database volume already removed or doesn't exist"

# Step 4: Start MySQL first
print_info "Step 4: Starting MySQL container..."
docker compose up -d mysql-mailcow

print_info "Waiting for MySQL to initialize (this takes time)..."
for i in {1..12}; do
    echo -n "."
    sleep 5
    if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null; then
        echo ""
        print_success "MySQL is ready!"
        break
    fi
done
echo ""

# Give MySQL extra time to create tables
print_info "Waiting for MySQL to create tables..."
sleep 10

# Step 5: Start Redis
print_info "Step 5: Starting Redis..."
docker compose up -d redis-mailcow
sleep 5

# Step 6: Start other essential services (except unbound initially)
print_info "Step 6: Starting essential services..."
docker compose up -d \
    unbound-mailcow \
    memcached-mailcow \
    dockerapi-mailcow \
    olefy-mailcow \
    netfilter-mailcow

sleep 10

# Step 7: Start remaining services
print_info "Step 7: Starting remaining services..."
docker compose up -d

print_info "Waiting for all services to initialize..."
sleep 30

# Step 8: Check status
print_info "Step 8: Checking container status..."
docker compose ps

echo ""
print_success "════════════════════════════════════════════════════════"
print_success "Mailcow fix completed!"
print_success "════════════════════════════════════════════════════════"
echo ""

# Check for common issues
print_info "Checking for issues..."
echo ""

# Check MySQL
if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null; then
    print_success "MySQL: Running"
else
    print_error "MySQL: Not responding"
fi

# Check if database has tables
TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u root -p$(grep DBROOT= mailcow.conf | cut -d= -f2) mailcow -e "SHOW TABLES;" 2>/dev/null | wc -l)
if [ "$TABLE_COUNT" -gt 1 ]; then
    print_success "Database: $((TABLE_COUNT-1)) tables created"
else
    print_warning "Database: No tables found (may still be initializing)"
fi

# Check nginx-mailcow
if docker compose ps nginx-mailcow | grep -q "Up"; then
    print_success "Nginx (internal): Running"
else
    print_warning "Nginx (internal): Not running (this is OK if using external Nginx)"
fi

echo ""
print_info "Next steps:"
echo "  1. Wait 2-3 minutes for all services to fully initialize"
echo "  2. Check logs: docker compose logs -f"
echo "  3. Access webmail: http://mail.doorfestival.com"
echo "  4. Login: admin / moohoo"
echo ""
print_warning "Note: Some warnings are normal during initialization"
print_warning "The internal Nginx SSL errors are OK (we use external Nginx)"
echo ""
