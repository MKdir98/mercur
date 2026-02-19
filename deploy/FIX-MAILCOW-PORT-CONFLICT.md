# Fix Mailcow Port Conflict

## Problem

Mailcow tried to bind to port 80, but Nginx is already using it:

```
Error: failed to bind host port 0.0.0.0:80/tcp: address already in use
```

## Solution

The deploy script now automatically handles this! Just run the mail installation command again.

## Automatic Fix

Simply run the installation command again:

```bash
cd ~/doorfestival
sudo bash deploy.sh production.properties mail
```

The script will:
1. Detect existing Mailcow installation
2. Ask if you want to update
3. Automatically configure ports to use localhost:8880
4. Configure Nginx reverse proxy
5. Restart containers

## Manual Fix (Alternative)

If you prefer to do it manually:

```bash
cd /opt/mailcow-dockerized

# Stop containers
docker compose down

# Edit configuration
nano mailcow.conf

# Change these lines:
HTTP_PORT=8880
HTTPS_PORT=8443
HTTP_BIND=127.0.0.1
HTTPS_BIND=127.0.0.1
SKIP_LETS_ENCRYPT=y

# Save and restart
docker compose up -d
```

## What the Script Does Automatically

When you run `sudo bash deploy.sh production.properties mail` on an existing installation:

1. **Detects existing Mailcow** at `/opt/mailcow-dockerized`
2. **Checks for mailcow.conf**:
   - If exists: Updates port configuration
   - If missing: Creates new config with correct settings
3. **Configures for localhost binding**:
   - HTTP_PORT=8880
   - HTTPS_PORT=8443
   - HTTP_BIND=127.0.0.1
   - HTTPS_BIND=127.0.0.1
   - SKIP_LETS_ENCRYPT=y
4. **Stops containers** gracefully
5. **Pulls latest images** (if needed)
6. **Starts containers** with new configuration
7. **Configures Nginx** reverse proxy automatically
8. **Reloads Nginx**

## Setup SSL

After Nginx is configured:

```bash
sudo bash deploy.sh production.properties ssl-mail
```

## Verify Installation

Check if everything is running:

```bash
# Check Mailcow containers
cd /opt/mailcow-dockerized
docker compose ps

# All containers should show "Up" or "healthy"

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Test access
curl -I http://localhost:8880
curl -I http://mail.doorfestival.com
```

## Access Mailcow

After fix:
- Local access: http://localhost:8880
- Public access: http://mail.doorfestival.com (after Nginx config)
- With SSL: https://mail.doorfestival.com (after SSL setup)

Default credentials:
- Username: `admin`
- Password: `moohoo`

**⚠️ Change the password immediately after login!**

## Architecture

```
Internet
    ↓
Nginx (port 80/443)
    ↓
Reverse Proxy
    ↓
Mailcow (localhost:8880)
```

This way:
- Your marketplace runs on: doorfestival.com
- Your backend runs on: api.doorfestival.com
- Your vendor panel runs on: vendor.doorfestival.com
- Your mail server runs on: mail.doorfestival.com

All through the same Nginx instance!

## Troubleshooting

### Containers won't start

```bash
cd /opt/mailcow-dockerized
docker compose logs
```

### Port still in use

Check what's using port 80:

```bash
sudo lsof -i :80
sudo netstat -tulpn | grep :80
```

### Nginx config test fails

```bash
sudo nginx -t
# Fix any errors shown
sudo systemctl reload nginx
```

### Can't access webmail

1. Check Mailcow is running: `docker compose ps`
2. Check Nginx config: `sudo nginx -t`
3. Check DNS: `dig mail.doorfestival.com`
4. Check logs: `tail -f /var/log/nginx/mailcow-production-error.log`

## Complete Reinstall (if needed)

If you want to start fresh:

```bash
# Stop and remove everything
cd /opt/mailcow-dockerized
docker compose down -v

# Remove directory
cd /opt
sudo rm -rf mailcow-dockerized

# Remove Nginx config
sudo rm /etc/nginx/sites-enabled/mailcow-*
sudo rm /etc/nginx/sites-available/mailcow-*
sudo systemctl reload nginx

# Install again
cd ~/doorfestival
sudo bash deploy.sh production.properties mail
```
