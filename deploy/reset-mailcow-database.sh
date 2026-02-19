#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
    echo -e "${CYAN}▶${NC} ${1}"
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

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Mailcow Database Reset & Proper Initialization"
echo "════════════════════════════════════════════════════════"
echo ""

print_warning "This will reset the database and start fresh."
print_warning "All existing mailboxes and data will be lost!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cancelled"
    exit 0
fi

echo ""
print_step "Step 1: Stopping all containers..."
docker compose down
print_success "All containers stopped"

echo ""
print_step "Step 2: Removing database volume..."
docker volume rm mailcowdockerized_mysql-vol-1 2>/dev/null && print_success "Database volume removed" || print_warning "Volume already removed"

echo ""
print_step "Step 3: Starting MySQL container ONLY..."
docker compose up -d mysql-mailcow
print_success "MySQL container started"

echo ""
print_info "Waiting for MySQL to initialize (this is important!)..."
echo -n "Progress: "
for i in {1..30}; do
    echo -n "."
    sleep 2
    if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
        echo ""
        print_success "MySQL is alive after $((i*2)) seconds!"
        break
    fi
done
echo ""

# Extra wait for table creation
print_info "Waiting for MySQL to create system tables..."
sleep 20

# Verify MySQL is ready
if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
    print_success "MySQL is ready and responding"
else
    print_error "MySQL is not responding properly"
    print_info "Checking MySQL logs..."
    docker compose logs --tail=50 mysql-mailcow
    exit 1
fi

echo ""
print_step "Step 4: Starting Redis..."
docker compose up -d redis-mailcow
sleep 5
print_success "Redis started"

echo ""
print_step "Step 5: Starting core services..."
docker compose up -d \
    unbound-mailcow \
    memcached-mailcow \
    dockerapi-mailcow
sleep 10
print_success "Core services started"

echo ""
print_step "Step 6: Starting PHP-FPM (database initialization)..."
docker compose up -d php-fpm-mailcow
print_info "Waiting for PHP-FPM to initialize database..."
sleep 30

# Check if tables are created
print_info "Checking if database tables are created..."
DBROOT=$(grep DBROOT= mailcow.conf | cut -d= -f2)
TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT mailcow -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLE_COUNT" -gt 5 ]; then
    print_success "Database initialized! Found $((TABLE_COUNT-1)) tables"
else
    print_warning "Tables not created yet, waiting more..."
    sleep 30
    TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT mailcow -e "SHOW TABLES;" 2>/dev/null | wc -l)
    if [ "$TABLE_COUNT" -gt 5 ]; then
        print_success "Database initialized! Found $((TABLE_COUNT-1)) tables"
    else
        print_error "Database tables not created"
        print_info "Checking PHP-FPM logs..."
        docker compose logs --tail=50 php-fpm-mailcow
    fi
fi

echo ""
print_step "Step 7: Starting remaining services..."
docker compose up -d
print_info "Waiting for all services to start..."
sleep 30
print_success "All services started"

echo ""
print_step "Step 8: Checking status..."
docker compose ps

echo ""
print_success "════════════════════════════════════════════════════════"
print_success "Database reset and initialization completed!"
print_success "════════════════════════════════════════════════════════"
echo ""

# Final checks
print_info "Final verification..."
echo ""

# Check MySQL
if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
    print_success "✓ MySQL: Running"
else
    print_error "✗ MySQL: Not responding"
fi

# Check tables
TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT mailcow -e "SHOW TABLES;" 2>/dev/null | wc -l)
if [ "$TABLE_COUNT" -gt 5 ]; then
    print_success "✓ Database: $((TABLE_COUNT-1)) tables"
else
    print_error "✗ Database: No tables"
fi

# Check PHP-FPM
if docker compose ps php-fpm-mailcow | grep -q "Up"; then
    print_success "✓ PHP-FPM: Running"
else
    print_error "✗ PHP-FPM: Not running"
fi

# Check SOGo
if docker compose ps sogo-mailcow | grep -q "Up"; then
    print_success "✓ SOGo: Running"
else
    print_error "✗ SOGo: Not running"
fi

echo ""
print_info "Next steps:"
echo "  1. Wait 2-3 minutes for all services to stabilize"
echo "  2. Access webmail: http://mail.doorfestival.com"
echo "  3. Login: admin / moohoo"
echo "  4. Change admin password immediately!"
echo ""
print_info "To check logs:"
echo "  cd /opt/mailcow-dockerized"
echo "  docker compose logs -f"
echo ""
