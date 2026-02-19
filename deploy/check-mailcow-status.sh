#!/bin/bash

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

MAILCOW_DIR="/opt/mailcow-dockerized"

if [ ! -d "$MAILCOW_DIR" ]; then
    print_error "Mailcow directory not found"
    exit 1
fi

cd "$MAILCOW_DIR"

echo "════════════════════════════════════════════════════════"
echo "Mailcow Status Check"
echo "════════════════════════════════════════════════════════"
echo ""

# Check MySQL
print_info "Checking MySQL..."
if docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
    print_success "MySQL is alive"
    
    # Check database
    DBROOT=$(grep DBROOT= mailcow.conf | cut -d= -f2)
    TABLE_COUNT=$(docker compose exec -T mysql-mailcow mysql -u root -p$DBROOT mailcow -e "SHOW TABLES;" 2>/dev/null | wc -l)
    
    if [ "$TABLE_COUNT" -gt 5 ]; then
        print_success "Database has $((TABLE_COUNT-1)) tables"
    else
        print_error "Database has no tables or not initialized"
    fi
else
    print_error "MySQL is not responding"
fi

echo ""

# Check Redis
print_info "Checking Redis..."
if docker compose exec -T redis-mailcow redis-cli ping 2>/dev/null | grep -q "PONG"; then
    print_success "Redis is responding"
else
    print_error "Redis is not responding"
fi

echo ""

# Check container networking
print_info "Checking Docker network..."
NETWORK_NAME=$(docker compose ps --format json 2>/dev/null | head -1 | grep -o '"Networks":"[^"]*"' | cut -d'"' -f4 || echo "mailcowdockerized_mailcow-network")
echo "Network: $NETWORK_NAME"

# Check if containers can reach each other
print_info "Testing container connectivity..."
if docker compose exec -T php-fpm-mailcow ping -c 1 mysql-mailcow 2>/dev/null | grep -q "1 received"; then
    print_success "php-fpm can reach mysql-mailcow"
else
    print_error "php-fpm cannot reach mysql-mailcow"
fi

echo ""

# Check all containers
print_info "Container Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""

# Check for common issues
print_info "Checking for issues..."

# Check if mysql is in docker ps
if docker ps | grep -q "mysql-mailcow"; then
    print_success "MySQL container is running"
else
    print_error "MySQL container is not running"
fi

# Check mysql logs for errors
print_info "Recent MySQL logs:"
docker compose logs --tail=10 mysql-mailcow

echo ""
print_info "Recent PHP-FPM logs:"
docker compose logs --tail=10 php-fpm-mailcow

echo ""
echo "════════════════════════════════════════════════════════"
print_info "Recommendations:"
echo ""

if ! docker compose exec -T mysql-mailcow mysqladmin ping -h localhost 2>/dev/null | grep -q "alive"; then
    echo "  1. MySQL is not responding - restart it:"
    echo "     docker compose restart mysql-mailcow"
    echo ""
fi

echo "  2. If issues persist, try full restart:"
echo "     cd /opt/mailcow-dockerized"
echo "     docker compose down"
echo "     docker compose up -d"
echo ""

echo "  3. Check detailed logs:"
echo "     docker compose logs -f"
echo ""
