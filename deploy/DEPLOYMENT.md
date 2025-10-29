# 🚀 Production Deployment Guide

Complete guide for deploying the Marketplace (Storefront + Backend + Vendor Panel) to production without Docker.

## 📋 Prerequisites

- **Server**: Ubuntu 20.04+ or Debian 11+ (VPS or dedicated server)
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: Minimum 2 cores
- **Storage**: Minimum 20GB
- **Access**: Root or sudo privileges
- **Domains**: 3 domains pointed to your server IP:
  - `yourdomain.com` (Storefront)
  - `api.yourdomain.com` (Backend API)
  - `vendor.yourdomain.com` (Vendor Panel)

## 🛠️ Quick Start

### Step 1: Download the Deployment Script

```bash
cd ~
wget https://raw.githubusercontent.com/yourusername/marketplace/main/marketplace-deploy.sh
chmod +x marketplace-deploy.sh
```

Or if you have the script locally:
```bash
chmod +x marketplace-deploy.sh
```

### Step 2: Edit Configuration

Open the script and edit these variables at the top:

```bash
nano marketplace-deploy.sh
```

Update these values:
```bash
# Change repository URL to your GitHub username/organization
REPO_BASE_URL="https://github.com/yourusername"

# Update your domains
STOREFRONT_DOMAIN="yourdomain.com"
BACKEND_DOMAIN="api.yourdomain.com"
VENDOR_DOMAIN="vendor.yourdomain.com"

# Set a secure database password
DB_PASSWORD="your_very_secure_password_here"
```

### Step 3: Run First Deployment

```bash
sudo bash marketplace-deploy.sh deploy
```

This will:
1. Install all dependencies (Node.js, PostgreSQL, Redis, Nginx, PM2)
2. Create database
3. Clone/copy all three projects
4. Generate environment files with placeholder values

### Step 4: Configure Environment Files

The script will create `.env` files that need your API keys and secrets. Edit these files:

#### 1. Storefront Environment
```bash
nano /var/www/marketplace/b2c-marketplace-storefront/.env.production
```

Update:
```env
MEDUSA_BACKEND_URL=http://api.yourdomain.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx  # Get from backend admin
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx
NEXT_PUBLIC_ALGOLIA_ID=YOUR_ALGOLIA_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_SEARCH_KEY
```

#### 2. Backend Environment
```bash
nano /var/www/marketplace/mercur/apps/backend/.env
```

Update:
```env
STRIPE_SECRET_API_KEY=sk_live_xxx
STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
ALGOLIA_APP_ID=YOUR_ALGOLIA_APP_ID
ALGOLIA_API_KEY=YOUR_ADMIN_API_KEY
VITE_TALK_JS_APP_ID=xxx
VITE_TALK_JS_SECRET_API_KEY=xxx
```

#### 3. Vendor Panel Environment
```bash
nano /var/www/marketplace/vendor-panel/.env.production
```

Update:
```env
VITE_TALK_JS_APP_ID=xxx
```

### Step 5: Run Deployment Again

After editing environment files:

```bash
sudo bash marketplace-deploy.sh deploy
```

This will:
1. Build all projects
2. Configure Nginx
3. Start all services with PM2
4. Configure firewall

## 🔐 SSL/HTTPS Setup

After deployment, enable HTTPS with Let's Encrypt:

```bash
# Install Certbot (if not installed)
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificates for all domains
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d vendor.yourdomain.com
```

Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx to use them
- Set up auto-renewal

## 📦 Project Structure

After deployment, your projects will be located at:

```
/var/www/marketplace/
├── b2c-marketplace-storefront/    # Next.js storefront (Port 3000)
├── mercur/                         # Medusa backend (Port 9000)
├── vendor-panel/                   # React vendor panel (Port 5173)
└── ecosystem.config.js             # PM2 configuration
```

## 🔄 Updating Deployments

To update all projects with latest changes:

```bash
sudo bash marketplace-deploy.sh deploy
```

This will:
1. Pull latest code from git
2. Install new dependencies
3. Rebuild all projects
4. Run database migrations
5. Restart services

## 🎛️ Managing Services

### View Status
```bash
pm2 status
```

### View Logs
```bash
# All services
pm2 logs

# Specific service
pm2 logs backend
pm2 logs storefront
pm2 logs vendor-panel

# Last 100 lines
pm2 logs --lines 100
```

### Restart Services
```bash
# Restart all
pm2 restart all

# Restart specific service
pm2 restart backend
pm2 restart storefront
pm2 restart vendor-panel
```

### Stop Services
```bash
# Stop all
pm2 stop all

# Stop specific
pm2 stop backend
```

### Monitor Resources
```bash
pm2 monit
```

### View Detailed Info
```bash
pm2 show backend
```

## 🗄️ Database Management

### Connect to Database
```bash
sudo -u postgres psql -d mercur
```

### Backup Database
```bash
sudo -u postgres pg_dump mercur > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
sudo -u postgres psql mercur < backup_file.sql
```

### Run Migrations
```bash
cd /var/www/marketplace/mercur/apps/backend
yarn db:migrate
```

## 🔧 Nginx Configuration

### Test Configuration
```bash
sudo nginx -t
```

### Reload Nginx
```bash
sudo systemctl reload nginx
```

### View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/storefront-access.log
sudo tail -f /var/log/nginx/backend-access.log
sudo tail -f /var/log/nginx/vendor-access.log

# Error logs
sudo tail -f /var/log/nginx/storefront-error.log
sudo tail -f /var/log/nginx/backend-error.log
sudo tail -f /var/log/nginx/vendor-error.log
```

## 🚨 Troubleshooting

### Service Won't Start

Check PM2 logs:
```bash
pm2 logs backend --lines 50
```

Check if port is already in use:
```bash
sudo lsof -i :9000  # Backend
sudo lsof -i :3000  # Storefront
sudo lsof -i :5173  # Vendor Panel
```

### Database Connection Issues

Check PostgreSQL status:
```bash
sudo systemctl status postgresql
```

Test connection:
```bash
psql -U mercuruser -d mercur -h localhost
```

### Redis Connection Issues

Check Redis status:
```bash
sudo systemctl status redis-server
redis-cli ping  # Should return PONG
```

### Nginx Issues

Check syntax:
```bash
sudo nginx -t
```

Check status:
```bash
sudo systemctl status nginx
```

### Out of Memory

Increase PM2 memory limits in `/var/www/marketplace/ecosystem.config.js`:
```javascript
max_memory_restart: '2G',  // Increase as needed
```

Then restart:
```bash
pm2 restart all
```

## 🔒 Security Best Practices

### 1. Firewall
```bash
# Check firewall status
sudo ufw status

# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Fail2Ban (Optional)
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 4. Database Security
- Use strong passwords
- Restrict PostgreSQL access to localhost
- Regular backups

### 5. Environment Variables
- Never commit `.env` files
- Use strong, random secrets
- Rotate keys regularly

## 📊 Monitoring

### System Resources
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Process list
pm2 monit
```

### Application Health
```bash
# Check if services are responding
curl http://localhost:9000/health
curl http://localhost:3000
curl http://localhost:5173
```

## 🔄 Backup Strategy

### Automated Backup Script

Create `/root/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump mercur > $BACKUP_DIR/db_$DATE.sql

# Backup environment files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz \
  /var/www/marketplace/*/\.env* \
  /var/www/marketplace/**/\.env*

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
sudo crontab -e

# Add this line (daily backup at 2 AM)
0 2 * * * /bin/bash /root/backup.sh
```

## 📈 Performance Optimization

### 1. Enable HTTP/2 in Nginx
Edit `/etc/nginx/sites-available/marketplace`:
```nginx
listen 443 ssl http2;
```

### 2. PM2 Cluster Mode (for high traffic)
Edit `ecosystem.config.js`:
```javascript
instances: 'max',    // Use all CPU cores
exec_mode: 'cluster'
```

### 3. PostgreSQL Tuning
Edit `/etc/postgresql/*/main/postgresql.conf`:
```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## 🌐 DNS Configuration

Point these A records to your server IP:

| Domain | Type | Value |
|--------|------|-------|
| yourdomain.com | A | YOUR_SERVER_IP |
| www.yourdomain.com | A | YOUR_SERVER_IP |
| api.yourdomain.com | A | YOUR_SERVER_IP |
| vendor.yourdomain.com | A | YOUR_SERVER_IP |

## 📝 Environment Variables Reference

### Required Services

1. **Stripe**: [https://stripe.com](https://stripe.com)
   - Get API keys from Dashboard → Developers → API keys
   - Setup webhooks for connected accounts

2. **Algolia**: [https://www.algolia.com](https://www.algolia.com)
   - Create an application
   - Get App ID and API keys

3. **Resend**: [https://resend.com](https://resend.com)
   - Get API key from Dashboard

4. **TalkJS**: [https://talkjs.com](https://talkjs.com)
   - Create an app
   - Get App ID and Secret Key

## 🆘 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -xe`
4. Verify all services are running: `pm2 status`
5. Test database connection
6. Verify environment variables are set correctly

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Medusa Documentation](https://docs.medusajs.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Happy Deploying! 🚀**

