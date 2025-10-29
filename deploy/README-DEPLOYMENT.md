# 🚀 Quick Deployment Guide

One-command deployment for the entire Marketplace stack (Storefront + Backend + Vendor Panel).

## ⚡ Quick Start

### 1. Download & Configure

```bash
# Download the script
cd /home/mehdi/all/repositories/github.com
chmod +x marketplace-deploy.sh

# Edit configuration (IMPORTANT!)
nano marketplace-deploy.sh
```

**Change these lines in the script:**
```bash
REPO_BASE_URL="https://github.com/yourusername"  # Your GitHub org/user
STOREFRONT_DOMAIN="yourdomain.com"
BACKEND_DOMAIN="api.yourdomain.com"
VENDOR_DOMAIN="vendor.yourdomain.com"
DB_PASSWORD="your_very_secure_password"
```

### 2. First Run (Initial Setup)

```bash
sudo bash marketplace-deploy.sh deploy
```

**This will:**
- ✅ Install Node.js, PostgreSQL, Redis, Nginx, PM2
- ✅ Create database
- ✅ Clone/copy projects
- ✅ Generate `.env` files (with placeholders)
- ⚠️ **STOP and ask you to edit environment files**

### 3. Configure Environment Files

Edit these 3 files with your actual API keys:

```bash
# 1. Storefront
nano /var/www/marketplace/b2c-marketplace-storefront/.env.production

# 2. Backend
nano /var/www/marketplace/mercur/apps/backend/.env

# 3. Vendor Panel
nano /var/www/marketplace/vendor-panel/.env.production
```

**You need API keys from:**
- Stripe (stripe.com)
- Algolia (algolia.com)
- Resend (resend.com)
- TalkJS (talkjs.com)

### 4. Run Deployment Again (Final Build)

```bash
sudo bash marketplace-deploy.sh deploy
```

**This will:**
- ✅ Build all projects
- ✅ Configure Nginx
- ✅ Start services with PM2
- ✅ Configure firewall
- 🎉 **Your site is LIVE!**

### 5. Enable HTTPS (Optional but Recommended)

```bash
sudo apt-get install -y certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d vendor.yourdomain.com
```

## 🔄 Update Deployment

Anytime you want to update (pull latest code and rebuild):

```bash
sudo bash marketplace-deploy.sh deploy
```

## 🎛️ Common Commands

```bash
# View service status
pm2 status

# View logs
pm2 logs
pm2 logs backend
pm2 logs storefront
pm2 logs vendor-panel

# Restart services
pm2 restart all
pm2 restart backend

# Stop services
pm2 stop all

# Monitor resources
pm2 monit

# Nginx
sudo nginx -t              # Test config
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
```

## 📍 Where Everything Lives

```
/var/www/marketplace/
├── b2c-marketplace-storefront/     # Next.js (Port 3000)
│   └── .env.production
├── mercur/                          # Medusa Backend (Port 9000)
│   └── apps/backend/.env
├── vendor-panel/                    # React (Port 5173)
│   └── .env.production
└── ecosystem.config.js              # PM2 config
```

## 🔧 What the Script Does

### On First Run:
1. Installs dependencies
2. Creates PostgreSQL database
3. Clones projects (from GitHub or copies from local)
4. Generates environment files
5. **Stops** and asks you to configure them

### On Subsequent Runs:
1. Pulls latest code from git
2. Installs new dependencies
3. Runs database migrations
4. Builds all projects
5. Configures Nginx
6. Restarts services with PM2

## 📊 Monitoring

```bash
# Check if everything is running
pm2 status

# Should show:
# backend       │ online
# storefront    │ online  
# vendor-panel  │ online

# Test endpoints
curl http://localhost:9000/health    # Backend
curl http://localhost:3000           # Storefront
curl http://localhost:5173           # Vendor Panel
```

## 🚨 Troubleshooting

### Services won't start?
```bash
pm2 logs backend --lines 50
```

### Port already in use?
```bash
sudo lsof -i :9000
sudo lsof -i :3000
sudo lsof -i :5173
```

### Database issues?
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d mercur
```

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## 🔐 Security Checklist

- [ ] Change DB_PASSWORD in script
- [ ] Configure firewall (script does this)
- [ ] Setup SSL certificates (certbot)
- [ ] Use strong, random secrets in .env files
- [ ] Don't commit .env files to git
- [ ] Regular backups
- [ ] Keep system updated: `apt-get update && apt-get upgrade`

## 📱 Access Your Sites

After deployment:

- **Storefront**: http://yourdomain.com
- **Backend API**: http://api.yourdomain.com
- **Vendor Panel**: http://vendor.yourdomain.com

With SSL enabled:
- https://yourdomain.com
- https://api.yourdomain.com
- https://vendor.yourdomain.com

## 🆘 Need Help?

1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify services: `pm2 status`
4. Check the full guide: `DEPLOYMENT.md`

---

**Made with ❤️ for easy deployment**

