# Marketplace Deployment Scripts

این فولدر شامل اسکریپت‌های دیپلوی برای Marketplace است که از **configuration-based approach** استفاده می‌کند.

## 📋 فایل‌های موجود

### اسکریپت‌ها
- **`deploy.sh`**: اسکریپت اصلی دیپلوی (Modular & Configuration-based)
- **`marketplace-deploy.sh`**: اسکریپت قدیمی (Legacy - Hard-coded configs)

### Configuration Files
- **`production.properties`**: تنظیمات production
- **`demo.properties`**: تنظیمات demo/test
- **`template.properties`**: Template برای ساخت configuration جدید

---

## ⚠️ پیش‌نیازها

قبل از دیپلوی، باید این سرویس‌ها **نصب و در حال اجرا** باشند:

### برای Production (الزامی)
- ✅ **Redis** - Cache & Session Storage
- ✅ **Elasticsearch** - Search Engine
- ✅ **PostgreSQL** - Database (اسکریپت خودش نصب می‌کنه)
- ✅ **Node.js 20** (اسکریپت خودش نصب می‌کنه)
- ✅ **Nginx** (اسکریپت خودش نصب می‌کنه)

### برای Demo (اختیاری ولی توصیه می‌شود)
- ⚠️ Redis & Elasticsearch

**نکته:** اسکریپت deploy به صورت خودکار وجود این سرویس‌ها را چک می‌کند.

### 🚀 نصب سریع Redis و Elasticsearch

**روش آسان - یک دستور:**
```bash
sudo bash install-services.sh
```

**یا جداگانه:**
```bash
# فقط Redis
sudo bash install-redis.sh

# فقط Elasticsearch
sudo bash install-elasticsearch.sh
```

📖 **راهنمای کامل:** [SERVICES-CHECK.md](SERVICES-CHECK.md)

---

## 🚀 نحوه استفاده

### 1️⃣ آماده‌سازی Configuration

ابتدا فایل configuration مورد نظر خود را ویرایش کنید:

```bash
# ویرایش production config
nano production.properties

# یا ساخت config جدید از template
cp template.properties myconfig.properties
nano myconfig.properties
```

**مهم:** حتماً این مقادیر را تغییر دهید:
- `DB_PASSWORD`: پسورد دیتابیس
- `STRIPE_*`: کلیدهای Stripe
- `RESEND_API_KEY`: کلید Resend
- `ALGOLIA_*`: کلیدهای Algolia
- `TALKJS_*`: کلیدهای TalkJS
- `SMS_IR_API_KEY`: کلید SMS.ir
- `POSTEX_API_KEY`: کلید Postex

### 2️⃣ دیپلوی اولیه (First Deploy)

```bash
# دیپلوی production
sudo bash deploy.sh production.properties deploy

# دیپلوی demo
sudo bash deploy.sh demo.properties deploy
```

اسکریپت به صورت خودکار:
- نصب dependencies (Node.js, Nginx, PostgreSQL, Redis, PM2)
- کپی/clone پروژه‌ها
- ساخت فایل‌های `.env` از روی configuration
- Build پروژه‌ها
- تنظیم Nginx
- اجرای PM2 processes
- تنظیم Firewall
- پرسیدن برای setup SSL

### 3️⃣ به‌روزرسانی (Update)

برای به‌روزرسانی کد بدون تغییر در Nginx/SSL:

```bash
# Update production
sudo bash deploy.sh production.properties update

# Update demo
sudo bash deploy.sh demo.properties update
```

### 4️⃣ Setup SSL (اختیاری)

```bash
# Setup SSL for production
sudo bash deploy.sh production.properties ssl

# Setup SSL for demo
sudo bash deploy.sh demo.properties ssl
```

**نکته:** قبل از اجرا، مطمئن شوید که DNS records به server شما اشاره می‌کنند.

---

## 🔄 Migration از اسکریپت قدیمی

اگر از `marketplace-deploy.sh` استفاده می‌کردید:

### مرحله 1: Stop کردن PM2 processes قدیمی

```bash
sudo pm2 stop backend storefront vendor-panel
sudo pm2 delete backend storefront vendor-panel
sudo pm2 save --force
```

### مرحله 2: غیرفعال کردن Nginx config قدیمی

```bash
sudo rm /etc/nginx/sites-enabled/marketplace
sudo nginx -t
sudo systemctl reload nginx
```

### مرحله 3: آماده‌سازی production.properties

فایل `production.properties` را با مقادیر واقعی پر کنید.

### مرحله 4: اجرای deploy جدید

```bash
sudo bash deploy.sh production.properties deploy
```

---

## 📦 ساختار فایل‌های Environment

اسکریپت به صورت خودکار این فایل‌ها را می‌سازد:

### Storefront
```
/var/www/marketplace/b2c-marketplace-storefront/.env.production
```

### Backend
```
/var/www/marketplace/mercur/apps/backend/.env
```

### Vendor Panel
```
/var/www/marketplace/vendor-panel/.env.production
```

همه مقادیر از فایل `.properties` شما می‌آیند.

---

## 🌍 اجرای چند محیط همزمان

می‌توانید production و demo را همزمان اجرا کنید:

```bash
# Deploy production
sudo bash deploy.sh production.properties deploy

# Deploy demo (روی پورت‌ها و دامنه‌های متفاوت)
sudo bash deploy.sh demo.properties deploy
```

PM2 processes:
- Production: `backend-production`, `storefront-production`, `vendor-panel-production`
- Demo: `backend-demo`, `storefront-demo`, `vendor-panel-demo`

---

## 🔍 دستورات مفید

### مشاهده وضعیت
```bash
pm2 status
pm2 monit
```

### مشاهده لاگ‌ها
```bash
# همه لاگ‌ها
pm2 logs

# Production
pm2 logs backend-production
pm2 logs storefront-production
pm2 logs vendor-panel-production

# Demo
pm2 logs backend-demo
```

### Restart
```bash
# Production
pm2 restart backend-production storefront-production vendor-panel-production

# Demo
pm2 restart backend-demo storefront-demo vendor-panel-demo
```

### بررسی Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
tail -f /var/log/nginx/backend-production-error.log
```

---

## ⚙️ Configuration Variables

### Required Variables
- `MODE`: نوع محیط (production, demo, staging, ...)
- `DEPLOY_DIR`: مسیر دیپلوی
- `GITHUB_USERNAME`: یوزرنیم GitHub
- `*_REPO`: نام repository ها
- `*_PORT`: پورت‌ها
- `*_DOMAIN`: دامنه‌ها
- `DB_*`: تنظیمات دیتابیس

### Optional Variables
- `REDIS_URL`: آدرس Redis (default: redis://localhost:6379)
- `DEFAULT_REGION`: منطقه پیش‌فرض (default: us)
- `DISABLE_SELLERS_REGISTRATION`: غیرفعال کردن ثبت‌نام فروشندگان (default: false)

### API Keys (Required for full functionality)
- Stripe
- Resend
- Algolia
- TalkJS
- SMS.ir
- Postex

---

## 🔒 Security Notes

1. **فایل‌های `.properties` را commit نکنید!**
   ```bash
   echo "*.properties" >> .gitignore
   echo "!template.properties" >> .gitignore
   ```

2. **JWT_SECRET و COOKIE_SECRET به صورت خودکار generate می‌شوند**
   
3. **مقادیر پیش‌فرض را حتماً تغییر دهید**

4. **SSL را حتماً فعال کنید:**
   ```bash
   sudo bash deploy.sh production.properties ssl
   ```

---

## 🐛 Troubleshooting

### خطای "Configuration file not found"
```bash
# مطمئن شوید فایل وجود دارد
ls -la *.properties

# یا مسیر کامل را بدهید
sudo bash deploy.sh /path/to/production.properties deploy
```

### خطای "Missing required configuration variables"
فایل `.properties` شما ناقص است. از `template.properties` استفاده کنید.

### PM2 processes راه‌اندازی نمی‌شوند
```bash
# بررسی لاگ‌ها
pm2 logs backend-production --lines 50

# بررسی فایل env
cat /var/www/marketplace/mercur/apps/backend/.env
```

### خطای Port Already in Use
یک process دیگر روی همان port در حال اجراست:
```bash
sudo lsof -i :9000
sudo pm2 list
```

---

## 📞 پشتیبانی

برای مشکلات و سوالات، issue در GitHub باز کنید.

---

## 📜 License

این اسکریپت‌ها بخشی از پروژه Door Festival Marketplace هستند.
