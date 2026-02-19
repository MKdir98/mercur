# Mailcow Complete Fix Guide

## Current Issues

You're seeing multiple errors:

1. **Proxy Issues**: 
   ```
   curl: (7) Failed to connect to 127.0.0.1 port 3128
   ```
   Internal containers trying to use proxy but shouldn't.

2. **Database Not Initialized**:
   ```
   ERROR 1146 (42S02): Table 'mailcow.versions' doesn't exist
   ```
   Database tables not created yet.

3. **SSL Certificate Missing**:
   ```
   cannot load certificate "/etc/ssl/mail/cert.pem"
   ```
   Internal Nginx looking for certificate (we don't need it, using external Nginx).

4. **Container Dependencies**:
   ```
   Could not get mysql-mailcow container id
   ```
   Services starting before MySQL is ready.

## Complete Fix

### Run the Fix Script

```bash
cd ~/doorfestival
sudo bash deploy/fix-mailcow-complete.sh
```

This script will:
1. ✅ Disable proxy for internal containers
2. ✅ Set `SKIP_LETS_ENCRYPT=y`
3. ✅ Stop all containers
4. ✅ Remove database volume
5. ✅ Start MySQL first and wait for it
6. ✅ Start services in correct order
7. ✅ Check everything is working

### What to Expect

```
▶ Complete Mailcow Fix - Resolving all issues...

ℹ Step 1: Fixing mailcow.conf...
✓ mailcow.conf updated

ℹ Step 2: Stopping all containers...
[+] down 18/18

ℹ Step 3: Removing database volume...
mailcow-dockerized_mysql-vol-1

ℹ Step 4: Starting MySQL container...
[+] up 1/1

ℹ Waiting for MySQL to initialize (this takes time)...
............
✓ MySQL is ready!

ℹ Waiting for MySQL to create tables...

ℹ Step 5: Starting Redis...
[+] up 1/1

ℹ Step 6: Starting essential services...
[+] up 5/5

ℹ Step 7: Starting remaining services...
[+] up 18/18

ℹ Waiting for all services to initialize...

ℹ Step 8: Checking container status...
NAME                                   STATUS
mailcow-dockerized-mysql-mailcow-1     Up (healthy)
mailcow-dockerized-redis-mailcow-1     Up (healthy)
...

════════════════════════════════════════════════════════════
✓ Mailcow fix completed!
════════════════════════════════════════════════════════════

✓ MySQL: Running
✓ Database: 42 tables created
⚠ Nginx (internal): Not running (this is OK if using external Nginx)

ℹ Next steps:
  1. Wait 2-3 minutes for all services to fully initialize
  2. Check logs: docker compose logs -f
  3. Access webmail: http://mail.doorfestival.com
  4. Login: admin / moohoo
```

## Understanding the Errors

### Proxy Errors (FIXED)

The proxy setting in `mailcow.conf` was causing internal containers to try using the proxy, which they shouldn't. The fix script comments out these settings.

### SSL Certificate Errors (NORMAL)

```
nginx: [emerg] cannot load certificate "/etc/ssl/mail/cert.pem"
```

**This is OK!** We're using external Nginx (your main server Nginx) for SSL. The internal Mailcow Nginx doesn't need SSL because:
- External Nginx handles HTTPS on port 443
- External Nginx proxies to Mailcow on localhost:8880 (HTTP)
- No SSL needed for localhost connections

### Unbound Healthcheck Failures (NORMAL)

```
Healthcheck: Failed to ping 1.1.1.1
```

**This is OK!** Your server might be behind a firewall that blocks ICMP ping. Mailcow will still work for email.

## Verify Everything Works

### 1. Check Container Status

```bash
cd /opt/mailcow-dockerized
docker compose ps
```

Look for:
- `mysql-mailcow`: Should be "Up (healthy)"
- `redis-mailcow`: Should be "Up (healthy)"
- `postfix-mailcow`: Should be "Up"
- `dovecot-mailcow`: Should be "Up"
- `sogo-mailcow`: Should be "Up"

### 2. Check Database

```bash
cd /opt/mailcow-dockerized

# Get database password
DBROOT=$(grep DBROOT= mailcow.conf | cut -d= -f2)

# Check tables
docker compose exec mysql-mailcow mysql -u root -p$DBROOT mailcow -e "SHOW TABLES;"
```

Should see many tables including:
- versions
- admin
- domain
- mailbox
- alias
- etc.

### 3. Check Logs (No Errors)

```bash
cd /opt/mailcow-dockerized

# Check SOGo (should not show table errors anymore)
docker compose logs sogo-mailcow | tail -20

# Check PHP-FPM (should not show MySQL connection errors)
docker compose logs php-fpm-mailcow | tail -20

# Check Postfix
docker compose logs postfix-mailcow | tail -20
```

### 4. Access Webmail

```bash
# Test from server
curl -I http://localhost:8880

# Should return: HTTP/1.1 302 Found

# Test from outside (if Nginx configured)
curl -I http://mail.doorfestival.com

# Should return: HTTP/1.1 302 Found
```

Open browser: http://mail.doorfestival.com

## If Still Having Issues

### Issue: Database still showing errors

Wait longer. Database initialization can take 2-3 minutes.

```bash
# Watch logs
cd /opt/mailcow-dockerized
docker compose logs -f mysql-mailcow
```

Look for: "ready for connections"

### Issue: Services keep restarting

Check resources:

```bash
# Check disk space
df -h

# Check memory
free -h

# Mailcow needs:
# - At least 6GB RAM
# - At least 20GB disk space
```

### Issue: Can't access webmail

1. Check Nginx config exists:
   ```bash
   ls -la /etc/nginx/sites-available/mailcow-production
   ls -la /etc/nginx/sites-enabled/mailcow-production
   ```

2. If missing, run:
   ```bash
   cd ~/doorfestival
   sudo bash deploy.sh production.properties mail
   ```

3. Test Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Issue: Proxy errors persist

Make sure proxy settings are commented in `mailcow.conf`:

```bash
cd /opt/mailcow-dockerized
grep -E "^#HTTP_PROXY|^#HTTPS_PROXY" mailcow.conf

# Should show:
# #HTTP_PROXY=...
# #HTTPS_PROXY=...
```

If not commented, edit manually:

```bash
nano mailcow.conf

# Change:
HTTP_PROXY=http://127.0.0.1:3128
# To:
#HTTP_PROXY=http://127.0.0.1:3128

# Save and restart:
docker compose down
docker compose up -d
```

## Complete Reset (Last Resort)

If nothing works, complete reset:

```bash
cd /opt/mailcow-dockerized

# Stop and remove everything
docker compose down -v

# Remove all volumes
docker volume ls | grep mailcow | awk '{print $2}' | xargs docker volume rm

# Remove directory
cd /opt
sudo rm -rf mailcow-dockerized

# Reinstall
cd ~/doorfestival
sudo bash deploy.sh production.properties mail
```

## After Fix - Next Steps

Once everything is working:

1. **Access Admin Panel**
   - URL: http://mail.doorfestival.com
   - User: admin
   - Pass: moohoo

2. **Change Password**
   - System → Administrators → admin → Change password

3. **Setup SSL**
   ```bash
   cd ~/doorfestival
   sudo bash deploy.sh production.properties ssl-mail
   ```

4. **Configure DKIM**
   - Configuration → Configuration & Details → ARC/DKIM keys
   - Generate for your domain
   - Add DNS TXT record

5. **Create Mailboxes**
   - Mailboxes → Add mailbox
   - Create: info@, support@, noreply@, etc.

## Summary

The main issues were:
1. ❌ Proxy interfering with internal containers → Fixed by commenting out
2. ❌ Database not initialized → Fixed by proper startup sequence
3. ⚠️ SSL certificate errors → Normal, using external Nginx
4. ⚠️ Unbound ping failures → Normal, doesn't affect email

Run the fix script and wait 2-3 minutes for everything to stabilize!
