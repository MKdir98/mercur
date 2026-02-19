#!/bin/bash

echo "=== Applying Nginx Rate Limit Fix ==="
echo ""

# Backup current config
echo "1. Creating backup..."
sudo cp /etc/nginx/sites-available/marketplace-production \
     /etc/nginx/sites-available/marketplace-production.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✓ Backup created"
echo ""

# Copy new config
echo "2. Applying new configuration..."
sudo cp nginx-rate-limit-fix.conf /etc/nginx/sites-available/marketplace-production
echo "   ✓ Configuration copied"
echo ""

# Test nginx config
echo "3. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "   ✓ Configuration is valid"
    echo ""
    
    # Reload nginx
    echo "4. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "   ✓ Nginx reloaded"
    echo ""
    
    echo "=== SUCCESS! ==="
    echo ""
    echo "Rate limits have been increased:"
    echo "  • API: 10r/s → 50r/s (burst: 30 → 100)"
    echo "  • General: 30r/s → 100r/s (burst: 20 → 50)"
    echo "  • Keepalive: 64 → 256 connections"
    echo "  • Connection header fixed for keepalive"
    echo ""
    echo "Test by opening: https://brand.doorfestival.com"
    echo "Monitor errors: tail -f /var/log/nginx/backend-production-error.log"
    echo ""
else
    echo "   ✗ Configuration test failed!"
    echo ""
    echo "Restoring backup..."
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/marketplace-production.backup.* | head -1)
    sudo cp "$LATEST_BACKUP" /etc/nginx/sites-available/marketplace-production
    echo "   ✓ Backup restored"
    exit 1
fi
