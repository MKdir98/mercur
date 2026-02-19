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

print_step "Fixing Mailcow Nginx SSL issue..."
echo ""

# Check if mailcow.conf exists
if [ ! -f "mailcow.conf" ]; then
    print_error "mailcow.conf not found!"
    exit 1
fi

# Get the hostname
HOSTNAME=$(grep "^MAILCOW_HOSTNAME=" mailcow.conf | cut -d= -f2)
print_info "Mailcow hostname: $HOSTNAME"

# Stop nginx container
print_info "Stopping nginx-mailcow container..."
docker compose stop nginx-mailcow

# Generate self-signed certificate for internal Nginx
print_info "Generating self-signed certificate for internal Nginx..."

# Create directory if not exists
docker compose exec -T mysql-mailcow mkdir -p /var/lib/mysql/ssl 2>/dev/null || true

# Generate certificate using acme container
print_info "Using acme container to generate certificate..."
docker compose exec -T acme-mailcow openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout /var/lib/acme/acme/private/key.pem \
  -out /var/lib/acme/acme/cert.pem \
  -subj "/CN=${HOSTNAME}" \
  -addext "subjectAltName=DNS:${HOSTNAME},DNS:*.${HOSTNAME}" 2>/dev/null || {
    print_warning "Could not generate via acme, trying direct method..."
    
    # Create temp directory
    mkdir -p /tmp/mailcow-ssl
    
    # Generate certificate
    openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
      -keyout /tmp/mailcow-ssl/key.pem \
      -out /tmp/mailcow-ssl/cert.pem \
      -subj "/CN=${HOSTNAME}" \
      -addext "subjectAltName=DNS:${HOSTNAME},DNS:*.${HOSTNAME}"
    
    # Copy to volume
    docker cp /tmp/mailcow-ssl/key.pem mailcowdockerized-acme-mailcow-1:/var/lib/acme/acme/private/key.pem
    docker cp /tmp/mailcow-ssl/cert.pem mailcowdockerized-acme-mailcow-1:/var/lib/acme/acme/cert.pem
    
    # Cleanup
    rm -rf /tmp/mailcow-ssl
}

print_success "Certificate generated"

# Make sure SKIP_LETS_ENCRYPT is set
print_info "Ensuring SKIP_LETS_ENCRYPT is enabled..."
if grep -q "^SKIP_LETS_ENCRYPT=y" mailcow.conf; then
    print_success "SKIP_LETS_ENCRYPT already set"
else
    if grep -q "^SKIP_LETS_ENCRYPT=" mailcow.conf; then
        sed -i 's/^SKIP_LETS_ENCRYPT=.*/SKIP_LETS_ENCRYPT=y/' mailcow.conf
    else
        echo "SKIP_LETS_ENCRYPT=y" >> mailcow.conf
    fi
    print_success "SKIP_LETS_ENCRYPT enabled"
fi

# Restart nginx
print_info "Starting nginx-mailcow container..."
docker compose up -d nginx-mailcow

print_info "Waiting for nginx to start..."
sleep 10

# Check status
print_info "Checking nginx status..."
if docker compose ps nginx-mailcow | grep -q "Up"; then
    print_success "Nginx is running!"
else
    print_warning "Nginx may still be starting, checking logs..."
    docker compose logs --tail=20 nginx-mailcow
fi

echo ""
print_success "════════════════════════════════════════════════════════"
print_success "Nginx fix completed!"
print_success "════════════════════════════════════════════════════════"
echo ""

# Check port 8880
print_info "Checking if port 8880 is accessible..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8880 | grep -q "302\|200"; then
    print_success "Port 8880 is accessible!"
    echo ""
    print_info "You can now access Mailcow at:"
    echo "  http://localhost:8880 (from server)"
    echo "  http://${HOSTNAME} (from outside, if Nginx configured)"
else
    print_warning "Port 8880 not responding yet, wait a moment and try:"
    echo "  curl -I http://localhost:8880"
fi

echo ""
print_info "Check all containers:"
echo "  docker compose ps"
echo ""
