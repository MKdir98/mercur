# Mailcow Mail Server Setup Guide

## Overview

This guide helps you install Mailcow, a complete mail server solution with webmail interface, alongside your marketplace deployment.

## Features

- **Complete Mail Server**: SMTP, IMAP, POP3
- **Webmail Interface**: SOGo webmail (modern web interface)
- **Security**: Built-in spam filter (Rspamd) and antivirus (ClamAV)
- **Easy Management**: Web-based admin panel
- **Docker-based**: Easy to install and maintain
- **Open Source**: Free and community-supported

## Prerequisites

### 1. DNS Configuration

Before installation, configure these DNS records:

```
# A Record for mail server
mail.yourdomain.com.    A    YOUR_SERVER_IP

# MX Record for email routing
yourdomain.com.         MX   10 mail.yourdomain.com.

# SPF Record (for email authentication)
yourdomain.com.         TXT  "v=spf1 mx ~all"

# DMARC Record (for email policy)
_dmarc.yourdomain.com.  TXT  "v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain.com"
```

### 2. Open Firewall Ports

The following ports need to be accessible:

- **25** (SMTP) - Email sending/receiving
- **110** (POP3) - Email retrieval
- **143** (IMAP) - Email access
- **465** (SMTPS) - Secure SMTP
- **587** (Submission) - Email submission
- **993** (IMAPS) - Secure IMAP
- **995** (POP3S) - Secure POP3

### 3. System Requirements

- **RAM**: Minimum 6GB (8GB+ recommended)
- **Disk**: 20GB+ free space
- **Docker**: Will be installed automatically

## Installation

### Quick Install

```bash
# Using your existing deploy script
sudo bash deploy.sh production.properties mail
```

The script will:
1. Install Docker and Docker Compose
2. Clone Mailcow repository
3. Generate configuration
4. Start all mail services
5. Open firewall ports

### Install with HTTP Proxy

If you need to use an HTTP proxy (for restricted networks):

```bash
# Add proxy settings to your .properties file
echo "HTTP_PROXY=http://proxy.example.com:8080" >> production.properties
echo "HTTPS_PROXY=http://proxy.example.com:8080" >> production.properties
echo "NO_PROXY=localhost,127.0.0.1" >> production.properties

# Then run installation
sudo bash deploy.sh production.properties mail
```

The script will automatically:
- Configure Docker daemon to use proxy
- Configure Docker client to use proxy
- Use proxy for git clone
- Use proxy for pulling Docker images
- Add proxy settings to mailcow.conf

### Manual Configuration (Optional)

If you want to customize settings before installation:

```bash
# Set custom mail domain in your .properties file
echo "MAIL_DOMAIN=mail.yourdomain.com" >> production.properties
echo "MAILCOW_DIR=/opt/mailcow-dockerized" >> production.properties

# Then run installation
sudo bash deploy.sh production.properties mail
```

## Post-Installation

### 1. Access Admin Panel

After installation:
- URL: `http://mail.yourdomain.com:8880`
- Default username: `admin`
- Default password: `moohoo`

**⚠️ IMPORTANT**: Change the default password immediately!

### 2. Setup Nginx Reverse Proxy

Add this to your Nginx configuration:

```bash
# Create new Nginx config
sudo nano /etc/nginx/sites-available/mailcow
```

Add this content:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mail.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8880;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        client_max_body_size 50M;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/mailcow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Setup SSL Certificate

```bash
sudo certbot --nginx -d mail.yourdomain.com
```

### 4. Configure DKIM (Email Authentication)

1. Login to Mailcow admin panel
2. Go to **Configuration** → **Configuration & Details**
3. Navigate to **ARC/DKIM keys**
4. Click **Generate** for your domain
5. Copy the DKIM public key
6. Add it as a TXT record in your DNS:

```
dkim._domainkey.yourdomain.com.  TXT  "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
```

### 5. Create Mailboxes

1. Go to **Mailboxes** in admin panel
2. Click **Add mailbox**
3. Create mailboxes like:
   - `info@yourdomain.com`
   - `support@yourdomain.com`
   - `noreply@yourdomain.com`

## Usage

### Access Webmail

Users can access webmail at:
- URL: `https://mail.yourdomain.com/SOGo/`
- Login with: `email@yourdomain.com` and password

### Email Client Configuration

For desktop/mobile email clients:

**IMAP (Incoming)**
- Server: `mail.yourdomain.com`
- Port: `993`
- Security: `SSL/TLS`

**SMTP (Outgoing)**
- Server: `mail.yourdomain.com`
- Port: `587`
- Security: `STARTTLS`

## Management Commands

```bash
# View logs
cd /opt/mailcow-dockerized
docker compose logs -f

# Restart all services
docker compose restart

# Stop all services
docker compose stop

# Start all services
docker compose up -d

# Update Mailcow
./update.sh

# Backup
./helper-scripts/backup_and_restore.sh backup all
```

## Integration with Your Marketplace

### Update Backend .env

Add these to your backend `.env` file:

```bash
# Email Configuration
MAIL_HOST=mail.yourdomain.com
MAIL_PORT=587
MAIL_USER=noreply@yourdomain.com
MAIL_PASSWORD=your_password
MAIL_FROM=noreply@yourdomain.com
MAIL_FROM_NAME="Your Marketplace"
```

### Send Emails from Backend

Your backend can now send emails through Mailcow:
- Order confirmations
- Password resets
- Vendor notifications
- Customer support

## Troubleshooting

### Check Service Status

```bash
cd /opt/mailcow-dockerized
docker compose ps
```

### Test Email Sending

```bash
# Send test email
echo "Test email body" | mail -s "Test Subject" test@example.com
```

### Check Logs

```bash
# All logs
docker compose logs

# Specific service
docker compose logs postfix-mailcow
docker compose logs dovecot-mailcow
docker compose logs rspamd-mailcow
```

### Port Conflicts

If ports are already in use, edit `mailcow.conf`:

```bash
cd /opt/mailcow-dockerized
nano mailcow.conf

# Change these if needed:
HTTP_PORT=8880
HTTPS_PORT=8443
```

### DNS Issues

Check your DNS records:

```bash
# Check MX record
dig MX yourdomain.com

# Check A record
dig A mail.yourdomain.com

# Check SPF
dig TXT yourdomain.com

# Check DKIM
dig TXT dkim._domainkey.yourdomain.com
```

## Security Best Practices

1. **Change default password** immediately
2. **Enable 2FA** for admin account
3. **Configure fail2ban** (included in Mailcow)
4. **Regular backups** (use Mailcow backup script)
5. **Monitor logs** for suspicious activity
6. **Keep updated** (run `./update.sh` regularly)

## Alternative: Lightweight Options

If Mailcow is too heavy for your server, consider:

### Mailu (Lighter alternative)

```bash
# Install Mailu instead
cd /opt
git clone https://github.com/Mailu/Mailu.git
cd Mailu
# Follow Mailu setup wizard
```

### Mail-in-a-Box (Simplest)

```bash
# One-command install
curl -s https://mailinabox.email/setup.sh | sudo bash
```

## Resources

- [Mailcow Documentation](https://docs.mailcow.email/)
- [Mailcow GitHub](https://github.com/mailcow/mailcow-dockerized)
- [Email Testing Tools](https://www.mail-tester.com/)
- [DNS Checker](https://mxtoolbox.com/)

## Support

For issues:
1. Check Mailcow logs
2. Visit [Mailcow Community](https://community.mailcow.email/)
3. Check [GitHub Issues](https://github.com/mailcow/mailcow-dockerized/issues)
