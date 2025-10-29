# 🔐 Environment Variables Guide

Complete guide for all environment variables needed across the three projects.

## 📁 File Locations

After deployment, you'll need to configure these files:

```
/var/www/marketplace/
├── b2c-marketplace-storefront/.env.production
├── mercur/apps/backend/.env
└── vendor-panel/.env.production
```

## 1️⃣ Storefront Environment Variables

**File**: `/var/www/marketplace/b2c-marketplace-storefront/.env.production`

```bash
# Backend API URL (should match your backend domain)
MEDUSA_BACKEND_URL=http://api.yourdomain.com

# Medusa publishable key (get from backend admin after first login)
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx

# Your storefront URL
NEXT_PUBLIC_BASE_URL=http://yourdomain.com

# Default region (us, eu, etc.)
NEXT_PUBLIC_DEFAULT_REGION=us

# Stripe publishable key (get from stripe.com)
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx

# Secret for revalidating cache (use: openssl rand -base64 32)
REVALIDATE_SECRET=your_random_secret_here

# Site metadata
NEXT_PUBLIC_SITE_NAME="Your Marketplace Name"
NEXT_PUBLIC_SITE_DESCRIPTION="Your marketplace description"

# Algolia search configuration
NEXT_PUBLIC_ALGOLIA_ID=YOUR_ALGOLIA_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_ALGOLIA_SEARCH_KEY
```

## 2️⃣ Backend Environment Variables

**File**: `/var/www/marketplace/mercur/apps/backend/.env`

```bash
# CORS Settings (adjust based on your domains)
STORE_CORS=http://yourdomain.com
ADMIN_CORS=http://api.yourdomain.com
VENDOR_CORS=http://vendor.yourdomain.com
AUTH_CORS=http://api.yourdomain.com,http://vendor.yourdomain.com,http://yourdomain.com

# Redis connection
REDIS_URL=redis://localhost:6379

# Security secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here

# Database connection
DATABASE_URL=postgres://mercuruser:your_db_password@localhost:5432/mercur
DB_NAME=mercur

# Stripe configuration (from stripe.com)
STRIPE_SECRET_API_KEY=sk_live_xxx
STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET=whsec_xxx

# Email service (from resend.com)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Algolia search (from algolia.com)
ALGOLIA_APP_ID=YOUR_ALGOLIA_APP_ID
ALGOLIA_API_KEY=YOUR_ALGOLIA_ADMIN_KEY

# TalkJS chat (from talkjs.com)
VITE_TALK_JS_APP_ID=xxx
VITE_TALK_JS_SECRET_API_KEY=xxx

# Application URLs (for links in emails, etc.)
VENDOR_PANEL_URL=http://vendor.yourdomain.com
STOREFRONT_URL=http://yourdomain.com
BACKEND_URL=http://api.yourdomain.com
```

## 3️⃣ Vendor Panel Environment Variables

**File**: `/var/www/marketplace/vendor-panel/.env.production`

```bash
# Medusa API base path
VITE_MEDUSA_BASE='/'

# Storefront URL
VITE_MEDUSA_STOREFRONT_URL=http://yourdomain.com

# Backend API URL
VITE_MEDUSA_BACKEND_URL=http://api.yourdomain.com

# TalkJS chat (from talkjs.com)
VITE_TALK_JS_APP_ID=xxx

# Registration settings
VITE_DISABLE_SELLERS_REGISTRATION=false
```

## 🔑 How to Get API Keys

### Stripe (https://stripe.com)

1. Create a Stripe account
2. Go to **Dashboard → Developers → API keys**
3. Get your **Publishable key** (starts with `pk_live_` or `pk_test_`)
4. Get your **Secret key** (starts with `sk_live_` or `sk_test_`)
5. For webhook secret:
   - Go to **Developers → Webhooks**
   - Create endpoint for connected accounts
   - Get **Signing secret** (starts with `whsec_`)

**What you need:**
- `NEXT_PUBLIC_STRIPE_KEY`: Publishable key
- `STRIPE_SECRET_API_KEY`: Secret key
- `STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET`: Webhook signing secret

---

### Algolia (https://www.algolia.com)

1. Create free Algolia account
2. Create a new **Application**
3. Go to **Settings → API Keys**
4. Get:
   - **Application ID**
   - **Search-Only API Key** (for frontend)
   - **Admin API Key** (for backend)

**What you need:**
- `NEXT_PUBLIC_ALGOLIA_ID`: Application ID
- `NEXT_PUBLIC_ALGOLIA_SEARCH_KEY`: Search-Only API Key
- `ALGOLIA_APP_ID`: Application ID (same as above)
- `ALGOLIA_API_KEY`: Admin API Key

---

### Resend (https://resend.com)

1. Create Resend account
2. Go to **Dashboard → API Keys**
3. Click **Create API Key**
4. Copy the key (starts with `re_`)
5. Add your domain for sending emails

**What you need:**
- `RESEND_API_KEY`: API Key
- `RESEND_FROM_EMAIL`: Email address (e.g., noreply@yourdomain.com)

---

### TalkJS (https://talkjs.com)

1. Create TalkJS account
2. Create a new **App**
3. Go to **Dashboard**
4. Get:
   - **App ID** (from dashboard URL or settings)
   - **Secret Key** (from Settings → API)

**What you need:**
- `VITE_TALK_JS_APP_ID`: App ID
- `VITE_TALK_JS_SECRET_API_KEY`: Secret Key

---

## 🔒 Generate Secure Secrets

For `JWT_SECRET`, `COOKIE_SECRET`, and `REVALIDATE_SECRET`:

```bash
# Generate random secure string
openssl rand -base64 32
```

Copy the output and use it as your secret.

## ✅ Quick Setup Checklist

### Before First Deployment:

- [ ] Copy `.env.template` files to `.env.production` or `.env`
- [ ] Update all domain names (yourdomain.com, api.yourdomain.com, etc.)
- [ ] Generate secure secrets for JWT and Cookie
- [ ] Set database password

### After First Deployment (Configure API keys):

- [ ] **Stripe**: Get API keys and webhook secret
- [ ] **Algolia**: Create app and get API keys
- [ ] **Resend**: Get API key and configure domain
- [ ] **TalkJS**: Create app and get credentials

### After Configuration:

- [ ] Run deployment again: `sudo bash marketplace-deploy.sh deploy`
- [ ] Verify all services are running: `pm2 status`
- [ ] Test each application in browser
- [ ] Setup SSL certificates with certbot

## 🔄 Updating Environment Variables

After changing any `.env` file:

```bash
# Restart all services
pm2 restart all

# Or restart specific service
pm2 restart backend
pm2 restart storefront
pm2 restart vendor-panel
```

## 🚨 Security Best Practices

### ✅ DO:
- Use strong, random secrets (32+ characters)
- Use different secrets for each environment (dev/staging/prod)
- Keep `.env` files backed up in a secure location
- Rotate secrets regularly (every 3-6 months)
- Use production Stripe keys only in production

### ❌ DON'T:
- Never commit `.env` files to git
- Never share secrets in plain text (use password managers)
- Don't use default or example values in production
- Don't use test keys in production

## 📝 Environment Variables Templates

### Quick Copy Template (Storefront)

```bash
cat > /var/www/marketplace/b2c-marketplace-storefront/.env.production << 'EOF'
MEDUSA_BACKEND_URL=http://api.yourdomain.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx
NEXT_PUBLIC_BASE_URL=http://yourdomain.com
NEXT_PUBLIC_DEFAULT_REGION=us
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx
REVALIDATE_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_SITE_NAME="Your Marketplace"
NEXT_PUBLIC_SITE_DESCRIPTION="Your Description"
NEXT_PUBLIC_ALGOLIA_ID=YOUR_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_KEY
EOF
```

### Quick Copy Template (Backend)

```bash
cat > /var/www/marketplace/mercur/apps/backend/.env << 'EOF'
STORE_CORS=http://yourdomain.com
ADMIN_CORS=http://api.yourdomain.com
VENDOR_CORS=http://vendor.yourdomain.com
AUTH_CORS=http://api.yourdomain.com,http://vendor.yourdomain.com,http://yourdomain.com
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgres://mercuruser:your_password@localhost:5432/mercur
DB_NAME=mercur
STRIPE_SECRET_API_KEY=sk_live_xxx
STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
ALGOLIA_APP_ID=YOUR_ID
ALGOLIA_API_KEY=YOUR_ADMIN_KEY
VITE_TALK_JS_APP_ID=xxx
VITE_TALK_JS_SECRET_API_KEY=xxx
VENDOR_PANEL_URL=http://vendor.yourdomain.com
STOREFRONT_URL=http://yourdomain.com
BACKEND_URL=http://api.yourdomain.com
EOF
```

### Quick Copy Template (Vendor Panel)

```bash
cat > /var/www/marketplace/vendor-panel/.env.production << 'EOF'
VITE_MEDUSA_BASE='/'
VITE_MEDUSA_STOREFRONT_URL=http://yourdomain.com
VITE_MEDUSA_BACKEND_URL=http://api.yourdomain.com
VITE_TALK_JS_APP_ID=xxx
VITE_DISABLE_SELLERS_REGISTRATION=false
EOF
```

## 🆘 Troubleshooting

### "Invalid publishable key"
- Make sure you copied the correct key from Stripe dashboard
- Check if using test key vs live key

### "Database connection failed"
- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -U mercuruser -d mercur -h localhost`

### "Redis connection failed"
- Check Redis is running: `sudo systemctl status redis-server`
- Test: `redis-cli ping` (should return PONG)

### "CORS errors"
- Verify STORE_CORS, ADMIN_CORS, AUTH_CORS match your domains
- Make sure to include http:// or https://
- After changing, restart backend: `pm2 restart backend`

---

**Need help? Check the full deployment guide: `DEPLOYMENT.md`**

