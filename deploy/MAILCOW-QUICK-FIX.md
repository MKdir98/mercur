# Mailcow Quick Fix Guide

## Current Situation

You have:
- ✅ Mailcow installed at `/opt/mailcow-dockerized`
- ✅ SSL certificate obtained for `mail.doorfestival.com`
- ❌ Nginx configuration missing
- ❌ SSL not installed in Nginx

## Quick Fix Steps

### Step 1: Configure Mailcow and Setup Nginx

```bash
cd ~/doorfestival
sudo bash deploy.sh production.properties mail
```

When asked "Update existing installation?", answer `y`

This will:
1. Fix `mailcow.conf` (create if missing, or update ports)
2. Stop and restart Mailcow containers with correct ports
3. Create Nginx reverse proxy configuration
4. Enable the Nginx config
5. Reload Nginx

### Step 2: Install SSL Certificate

Since the certificate is already obtained, you have two options:

#### Option A: Use deploy script (Recommended)

```bash
sudo bash deploy.sh production.properties ssl-mail
```

This will now work because Nginx config exists.

#### Option B: Manual installation

```bash
sudo certbot install --cert-name mail.doorfestival.com
```

Then select the Nginx config when prompted.

## Verify Everything Works

### 1. Check Mailcow Containers

```bash
cd /opt/mailcow-dockerized
docker compose ps
```

All containers should show "Up" or "healthy".

### 2. Check Nginx Configuration

```bash
sudo nginx -t
sudo systemctl status nginx
```

### 3. Check Nginx Config File

```bash
ls -la /etc/nginx/sites-available/mailcow-*
ls -la /etc/nginx/sites-enabled/mailcow-*
```

Should see `mailcow-production` in both directories.

### 4. Test HTTP Access

```bash
curl -I http://localhost:8880
curl -I http://mail.doorfestival.com
```

### 5. Test HTTPS Access (after SSL)

```bash
curl -I https://mail.doorfestival.com
```

## Access Mailcow

After everything is configured:

- **URL**: https://mail.doorfestival.com
- **Username**: admin
- **Password**: moohoo

**⚠️ IMPORTANT**: Change the password immediately after first login!

## Complete Architecture

```
Internet
    ↓
Nginx (port 80/443)
    ├─→ doorfestival.com        → Storefront (localhost:3000)
    ├─→ api.doorfestival.com    → Backend (localhost:9000)
    ├─→ vendor.doorfestival.com → Vendor Panel (localhost:4173)
    └─→ mail.doorfestival.com   → Mailcow (localhost:8880)
```

## Troubleshooting

### Issue: "Could not automatically find a matching server block"

**Cause**: Nginx config for mail doesn't exist yet.

**Solution**: Run `sudo bash deploy.sh production.properties mail` first.

### Issue: Port 80 conflict

**Cause**: Mailcow trying to bind to 0.0.0.0:80 instead of 127.0.0.1:8880.

**Solution**: The deploy script now handles this automatically. Just run:

```bash
sudo bash deploy.sh production.properties mail
```

Answer `y` when asked to update.

### Issue: Containers won't start

Check logs:

```bash
cd /opt/mailcow-dockerized
docker compose logs
```

Common issues:
- Missing `mailcow.conf` → Script will create it
- Wrong ports in config → Script will fix it
- Environment variables not set → Check logs

### Issue: Can't access webmail

1. Check Mailcow is running:
   ```bash
   cd /opt/mailcow-dockerized
   docker compose ps
   ```

2. Check Nginx config exists:
   ```bash
   ls /etc/nginx/sites-enabled/mailcow-*
   ```

3. Check Nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

4. Check DNS:
   ```bash
   dig mail.doorfestival.com
   ```

5. Check firewall:
   ```bash
   sudo ufw status
   ```

## Manual Nginx Configuration (if needed)

If for some reason the automatic configuration doesn't work, here's the manual config:

```bash
sudo nano /etc/nginx/sites-available/mailcow-production
```

Add this content:

```nginx
# Mailcow Webmail - production
server {
    listen 80;
    listen [::]:80;
    server_name mail.doorfestival.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/mailcow-production-access.log;
    error_log /var/log/nginx/mailcow-production-error.log;
    
    location / {
        proxy_pass http://127.0.0.1:8880;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        client_max_body_size 50M;
        client_body_timeout 120s;
        
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/mailcow-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Installation Tasks

### 1. Change Admin Password

1. Login at https://mail.doorfestival.com
2. Go to **System** → **Administrators**
3. Click on **admin**
4. Change password
5. Save

### 2. Configure DKIM

1. Go to **Configuration** → **Configuration & Details**
2. Navigate to **ARC/DKIM keys**
3. Click **Generate** for `doorfestival.com`
4. Copy the DKIM public key
5. Add DNS TXT record:
   ```
   dkim._domainkey.doorfestival.com.  TXT  "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
   ```

### 3. Configure SPF

Add DNS TXT record:
```
doorfestival.com.  TXT  "v=spf1 mx ~all"
```

### 4. Configure DMARC

Add DNS TXT record:
```
_dmarc.doorfestival.com.  TXT  "v=DMARC1; p=quarantine; rua=mailto:postmaster@doorfestival.com"
```

### 5. Create Mailboxes

1. Go to **Mailboxes**
2. Click **Add mailbox**
3. Create mailboxes:
   - info@doorfestival.com
   - support@doorfestival.com
   - noreply@doorfestival.com

## Integration with Backend

Update your backend `.env`:

```bash
# Email Configuration
MAIL_HOST=mail.doorfestival.com
MAIL_PORT=587
MAIL_USER=noreply@doorfestival.com
MAIL_PASSWORD=your_mailbox_password
MAIL_FROM=noreply@doorfestival.com
MAIL_FROM_NAME="Door Festival"
MAIL_ENCRYPTION=tls
```

## Useful Commands

```bash
# View all logs
cd /opt/mailcow-dockerized
docker compose logs -f

# View specific service logs
docker compose logs -f postfix-mailcow
docker compose logs -f dovecot-mailcow
docker compose logs -f nginx-mailcow

# Restart all services
docker compose restart

# Restart specific service
docker compose restart postfix-mailcow

# Stop all services
docker compose stop

# Start all services
docker compose up -d

# Update Mailcow
./update.sh

# Backup
./helper-scripts/backup_and_restore.sh backup all

# Restore
./helper-scripts/backup_and_restore.sh restore
```

## Support Resources

- [Mailcow Documentation](https://docs.mailcow.email/)
- [Mailcow Community](https://community.mailcow.email/)
- [GitHub Issues](https://github.com/mailcow/mailcow-dockerized/issues)
- [Email Testing](https://www.mail-tester.com/)
- [DNS Checker](https://mxtoolbox.com/)
