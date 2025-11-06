# 🚀 راهنمای سریع (Quick Start)

## تفاوت اصلی با اسکریپت قبلی

### ❌ قبل (marketplace-deploy.sh)
```bash
# همه config ها داخل اسکریپت hard-coded بودند
sudo bash marketplace-deploy.sh deploy
```

### ✅ حالا (deploy.sh)
```bash
# همه config ها در یک فایل جدا هستند
sudo bash deploy.sh production.properties deploy
```

---

## 📋 مراحل شروع (5 دقیقه)

### مرحله 0️⃣: نصب Redis و Elasticsearch (الزامی برای production)

**برای production حتماً باید این دو سرویس نصب باشند!**

#### 🚀 روش سریع (توصیه می‌شود)

```bash
cd /home/mehdi/all/repositories/github.com/mercur/deploy
sudo bash install-services.sh
```

این اسکریپت **هر دو سرویس** رو نصب می‌کنه و چک می‌کنه که درست کار کنن.

#### یا دستی:

```bash
# فقط Redis
sudo bash install-redis.sh

# فقط Elasticsearch
sudo bash install-elasticsearch.sh
```

راهنمای کامل و troubleshooting در [SERVICES-CHECK.md](SERVICES-CHECK.md)

**نکته:** اسکریپت deploy خودش این‌ها رو چک می‌کنه و اگه production باشه و نباشند، خطا می‌ده.

### مرحله 1️⃣: ویرایش Configuration

```bash
cd /home/mehdi/all/repositories/github.com/mercur/deploy

# ویرایش فایل production
nano production.properties
```

**حداقل این‌ها را تغییر بده:**
```properties
# Database
DB_PASSWORD=پسورد_امن_خودت

# Stripe (از dashboard.stripe.com)
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend Email (از resend.com)
RESEND_API_KEY=re_...

# Algolia (از algolia.com)
ALGOLIA_APP_ID=...
ALGOLIA_ADMIN_KEY=...
ALGOLIA_SEARCH_KEY=...

# TalkJS (از talkjs.com)
TALKJS_APP_ID=...
TALKJS_SECRET_KEY=...

# SMS.ir (از app.sms.ir)
SMS_IR_API_KEY=...

# Postex (از postex.ir)
POSTEX_API_KEY=...
```

### مرحله 2️⃣: اگر از اسکریپت قدیمی استفاده می‌کردی

```bash
# Stop کردن PM2 processes قدیمی
sudo pm2 stop backend storefront vendor-panel
sudo pm2 delete backend storefront vendor-panel
sudo pm2 save --force

# غیرفعال کردن Nginx config قدیمی
sudo rm /etc/nginx/sites-enabled/marketplace
sudo nginx -t
sudo systemctl reload nginx
```

### مرحله 3️⃣: اجرای Deploy

```bash
sudo bash deploy.sh production.properties deploy
```

اسکریپت این کارها را انجام می‌دهد:
- ✅ نصب dependencies
- ✅ کپی/clone پروژه‌ها
- ✅ ساخت `.env` files از روی `production.properties`
- ✅ Build پروژه‌ها
- ✅ تنظیم Nginx
- ✅ اجرای PM2
- ✅ پرسیدن برای SSL setup

---

## 🔄 برای به‌روزرسانی بعدی

**فقط همین:**

```bash
sudo bash deploy.sh production.properties update
```

این دستور:
- کد را update می‌کنه
- Build می‌گیره
- PM2 رو restart می‌کنه
- **Nginx/SSL رو دست نمی‌زنه** ✅

---

## 🌍 چند محیط همزمان؟

می‌تونی production و demo رو همزمان اجرا کنی:

```bash
# Production روی پورت‌های 3000, 9000, 5173
sudo bash deploy.sh production.properties deploy

# Demo روی پورت‌های 3001, 9001, 5174
sudo bash deploy.sh demo.properties deploy
```

PM2 به صورت خودکار اسم‌های متفاوت می‌ذاره:
- `backend-production`, `backend-demo`
- `storefront-production`, `storefront-demo`
- `vendor-panel-production`, `vendor-panel-demo`

---

## 🔍 مشاهده وضعیت

```bash
# لیست همه process ها
pm2 list

# لاگ production
pm2 logs backend-production

# لاگ demo
pm2 logs backend-demo

# Restart production
pm2 restart backend-production storefront-production vendor-panel-production
```

---

## 🔒 SSL Setup

```bash
sudo bash deploy.sh production.properties ssl
```

یا می‌تونی بعد از deploy هم اینو اجرا کنی.

---

## ❓ سوالات متداول

### Q: فایل‌های env قدیمی من چی می‌شه؟
A: اگر وجود داشته باشند، اسکریپت اون‌ها رو نگه می‌داره. فقط اگر نباشند، از روی `.properties` می‌سازه.

### Q: می‌تونم config رو بعداً تغییر بدم؟
A: آره! فایل‌های `.env` رو مستقیماً ویرایش کن یا `production.properties` رو تغییر بده و دوباره `deploy` کن.

### Q: چطور migration کامل انجام بدم؟
A: دقیقاً مراحل بالا رو دنبال کن. اول PM2 و Nginx قدیمی رو stop کن، بعد deploy جدید.

### Q: configuration.properties رو کجا نگه دارم؟
A: همونجا که الان هستش (`deploy/`) ولی حتماً `.gitignore` رو چک کن که commit نشه.

---

## 🎯 مزایای اسکریپت جدید

| ویژگی | قدیمی | جدید |
|-------|-------|------|
| Configuration | Hard-coded | External file |
| Multi-environment | ❌ | ✅ |
| Easy updates | ❌ | ✅ |
| Clean separation | ❌ | ✅ |
| Reusable | ❌ | ✅ |
| Security | Secrets in script | Secrets in gitignored file |

---

## 📞 مشکل داری؟

1. بررسی لاگ‌ها: `pm2 logs`
2. بررسی nginx: `sudo nginx -t`
3. بررسی config: `cat production.properties`
4. خواندن `README.md` کامل

---

## ✅ Checklist نهایی

- [ ] `production.properties` را ویرایش کردم
- [ ] همه API Keys را وارد کردم
- [ ] PM2 processes قدیمی را stop کردم (اگر لازم بود)
- [ ] Nginx config قدیمی را حذف کردم (اگر لازم بود)
- [ ] `sudo bash deploy.sh production.properties deploy` را اجرا کردم
- [ ] DNS records را تنظیم کردم
- [ ] SSL را setup کردم
- [ ] سایت را تست کردم

---

**تمام! 🎉**

حالا با اسکریپت جدید کار می‌کنی و همه چی از یک فایل configuration مدیریت می‌شه.

