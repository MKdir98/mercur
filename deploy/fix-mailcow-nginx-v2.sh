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

print_step "Fixing Mailcow Nginx SSL issue (v2)..."
echo ""

# Get the hostname
HOSTNAME=$(grep "^MAILCOW_HOSTNAME=" mailcow.conf | cut -d= -f2)
print_info "Mailcow hostname: $HOSTNAME"

# Stop nginx container
print_info "Stopping nginx-mailcow container..."
docker compose stop nginx-mailcow

# Generate self-signed certificate in host
print_info "Generating self-signed certificate..."
mkdir -p /tmp/mailcow-ssl

openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout /tmp/mailcow-ssl/key.pem \
  -out /tmp/mailcow-ssl/cert.pem \
  -subj "/CN=${HOSTNAME}" 2>/dev/null

print_success "Certificate generated in /tmp/mailcow-ssl/"

# Find the correct volume path
print_info "Finding acme volume..."
ACME_VOLUME=$(docker volume inspect mailcowdockerized_acme-vol-1 --format '{{ .Mountpoint }}' 2>/dev/null || echo "")

if [ -z "$ACME_VOLUME" ]; then
    print_warning "Could not find acme volume, trying alternative method..."
    
    # Copy directly to nginx volume
    print_info "Copying to nginx SSL directory..."
    NGINX_VOLUME=$(docker volume inspect mailcowdockerized_sogo-web-vol-1 --format '{{ .Mountpoint }}' 2>/dev/null || echo "")
    
    # Create SSL directory in data
    mkdir -p ./data/assets/ssl
    cp /tmp/mailcow-ssl/cert.pem ./data/assets/ssl/cert.pem
    cp /tmp/mailcow-ssl/key.pem ./data/assets/ssl/key.pem
    
    print_success "Certificates copied to data/assets/ssl/"
else
    print_info "Copying certificates to acme volume..."
    mkdir -p "${ACME_VOLUME}/acme"
    cp /tmp/mailcow-ssl/cert.pem "${ACME_VOLUME}/acme/cert.pem"
    cp /tmp/mailcow-ssl/key.pem "${ACME_VOLUME}/acme/key.pem"
    print_success "Certificates copied to acme volume"
fi

# Cleanup temp
rm -rf /tmp/mailcow-ssl

# Make sure SKIP_LETS_ENCRYPT is set
print_info "Configuring mailcow.conf..."
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

# Also set SKIP_CLAMD if not set (to reduce resource usage)
if ! grep -q "^SKIP_CLAMD=" mailcow.conf; then
    echo "SKIP_CLAMD=n" >> mailcow.conf
fi

# Start nginx
print_info "Starting nginx-mailcow container..."
docker compose up -d nginx-mailcow

print_info "Waiting for nginx to start..."
sleep 15

# Check status
print_info "Checking nginx status..."
NGINX_STATUS=$(docker compose ps nginx-mailcow --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$NGINX_STATUS" = "running" ]; then
    print_success "Nginx is running!"
elif docker compose ps nginx-mailcow | grep -q "Up"; then
    print_success "Nginx is up!"
else
    print_warning "Nginx status: $NGINX_STATUS"
    print_info "Checking logs..."
    docker compose logs --tail=30 nginx-mailcow
fi

echo ""
print_success "════════════════════════════════════════════════════════"
print_success "Nginx fix completed!"
print_success "════════════════════════════════════════════════════════"
echo ""

# Check port 8880
print_info "Testing port 8880..."
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8880 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
    print_success "✓ Port 8880 is accessible! (HTTP $HTTP_CODE)"
    echo ""
    print_info "You can now access Mailcow:"
    echo "  • From server: http://localhost:8880"
    echo "  • From outside: http://${HOSTNAME}"
    echo ""
    print_info "Default login:"
    echo "  • Username: admin"
    echo "  • Password: moohoo"
elif [ "$HTTP_CODE" = "000" ]; then
    print_warning "Port 8880 not responding yet"
    print_info "Wait a moment and try: curl -I http://localhost:8880"
else
    print_warning "Port 8880 returned HTTP $HTTP_CODE"
fi

echo ""
print_info "Check all containers status:"
echo "  cd /opt/mailcow-dockerized"
echo "  docker compose ps"
echo ""
print_info "View nginx logs:"
echo "  docker compose logs -f nginx-mailcow"
echo ""
