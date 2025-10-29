# 🚀 Production Deployment Scripts

This directory contains all files needed to deploy the entire marketplace stack to production.

## 📦 What's Inside

```
deploy/
├── marketplace-deploy.sh       ⭐ Main deployment script (START HERE!)
├── README-DEPLOYMENT.md        📖 Quick start guide
├── DEPLOYMENT.md               📚 Complete documentation
├── ENV-VARIABLES-GUIDE.md      🔐 Environment variables guide
└── FILES-SUMMARY.md            📋 Files overview
```

## ⚡ Quick Start

### 1. Configure the Script

```bash
cd mercur/deploy
nano marketplace-deploy.sh
```

Edit these values:
```bash
GITHUB_USERNAME="mkdir98"        # Your GitHub username
STOREFRONT_DOMAIN="yourdomain.com"
BACKEND_DOMAIN="api.yourdomain.com"
VENDOR_DOMAIN="vendor.yourdomain.com"
DB_PASSWORD="your_secure_password"
```

### 2. Run Deployment

```bash
sudo bash marketplace-deploy.sh deploy
```

## 📚 Documentation

- **Quick Start**: `README-DEPLOYMENT.md`
- **Complete Guide**: `DEPLOYMENT.md`
- **Environment Setup**: `ENV-VARIABLES-GUIDE.md`
- **Files Overview**: `FILES-SUMMARY.md`

## 🎯 What It Deploys

This script deploys all three applications:

1. **Storefront** (b2c-marketplace-storefront) - Next.js on port 3000
2. **Backend** (mercur) - Medusa.js on port 9000
3. **Vendor Panel** (vendor-panel) - React on port 5173

With:
- ✅ Nginx reverse proxy
- ✅ PM2 process management
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ SSL ready (certbot instructions included)

## 📍 Deployment Location

All projects will be deployed to:
```
/var/www/marketplace/
├── b2c-marketplace-storefront/
├── mercur/
└── vendor-panel/
```

## 🔄 Updates

To update all projects, just run the deploy command again:
```bash
sudo bash marketplace-deploy.sh deploy
```

---

**Need help? Check `README-DEPLOYMENT.md` first!**

