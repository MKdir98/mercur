# 📊 مقایسه دو اسکریپت

## marketplace-deploy.sh (قدیمی) vs deploy.sh (جدید)

---

## 🔧 Configuration Management

### marketplace-deploy.sh (قدیمی)
```bash
# همه داخل اسکریپت hard-coded
STOREFRONT_DOMAIN="doorfestival.com"
BACKEND_DOMAIN="core.doorfestival.com"
VENDOR_DOMAIN="brand.doorfestival.com"
DB_NAME="mercur"
DB_USER="mercuruser"
DB_PASSWORD="your_secure_password_here"

# باید اسکریپت رو ویرایش کنی
nano marketplace-deploy.sh
```

❌ **مشکلات:**
- Secret ها داخل اسکریپت
- هر بار باید اسکریپت رو edit کنی
- Version control مشکل‌ساز (secrets commit میشه)
- فقط یک محیط

### deploy.sh (جدید)
```bash
# همه از فایل external می‌خونه
# فقط فایل .properties رو ویرایش می‌کنی
nano production.properties
```

✅ **مزایا:**
- Secret ها جدا از کد
- فایل .properties در .gitignore
- چند محیط همزمان (demo, production, staging, ...)
- Reusable برای پروژه‌های دیگر

---

## 📦 PM2 Process Names

### قدیمی
```bash
pm2 list
# Output:
# backend
# storefront
# vendor-panel
```

❌ **مشکل:** اگر بخوای demo و production همزمان داشته باشی، conflict می‌کنه!

### جدید
```bash
pm2 list
# Output:
# backend-production
# storefront-production
# vendor-panel-production

# backend-demo
# storefront-demo
# vendor-panel-demo
```

✅ **مزیت:** می‌تونی چندین محیط همزمان اجرا کنی

---

## 🌐 Nginx Configuration

### قدیمی
```bash
# فقط یک config
/etc/nginx/sites-available/marketplace

# Upstream names:
upstream backend { ... }
upstream storefront { ... }
upstream vendor_panel { ... }
```

❌ **مشکل:** فقط یک محیط، تداخل در upstream names

### جدید
```bash
# هر محیط config جدا
/etc/nginx/sites-available/marketplace-production
/etc/nginx/sites-available/marketplace-demo

# Upstream names with mode:
upstream backend_production { ... }
upstream storefront_production { ... }
upstream backend_demo { ... }
upstream storefront_demo { ... }
```

✅ **مزیت:** چند محیط بدون conflict

---

## 🚀 نحوه استفاده

### قدیمی

```bash
# Deploy
sudo bash marketplace-deploy.sh deploy

# Update
sudo bash marketplace-deploy.sh update

# SSL
sudo bash marketplace-deploy.sh ssl
```

### جدید

```bash
# Deploy production
sudo bash deploy.sh production.properties deploy

# Deploy demo
sudo bash deploy.sh demo.properties deploy

# Update production
sudo bash deploy.sh production.properties update

# SSL production
sudo bash deploy.sh production.properties ssl
```

---

## 📁 ساختار فایل‌های Environment

### قدیمی

Environment files ساخته می‌شوند ولی همیشه از مقادیر hard-coded داخل اسکریپت:

```bash
# اگر این‌ها در اسکریپت نباشند، placeholder می‌ذاره
STRIPE_SECRET_API_KEY=your_stripe_secret_key_here
```

### جدید

همه از `.properties` می‌آیند:

```bash
# در production.properties
STRIPE_SECRET_KEY=sk_live_abc123...

# در .env نهایی
STRIPE_SECRET_API_KEY=sk_live_abc123...
```

✅ **مزیت:** یکجا همه رو مدیریت می‌کنی

---

## 🔒 Security

### قدیمی

```bash
# Secrets داخل اسکریپت
DB_PASSWORD="your_secure_password_here"

# اگر commit کنی، secret ها commit میشن ❌
git add marketplace-deploy.sh
git commit -m "Update config"  # خطرناک!
```

### جدید

```bash
# .gitignore جلوی commit گرفته
*.properties  # ignored
!template.properties  # only template allowed

# می‌تونی اسکریپت رو commit کنی بدون نگرانی ✅
git add deploy.sh
git commit -m "Update deploy script"  # امن!
```

---

## 🌍 Multi-Environment Support

### قدیمی

برای اجرای demo باید:
1. اسکریپت رو کپی کنی
2. همه hardcoded values رو تغییر بدی
3. دستی port ها رو عوض کنی
4. خطر conflict در PM2 و Nginx

❌ **خیلی کار زیاد!**

### جدید

فقط یک فایل config جدید بساز:

```bash
cp template.properties demo.properties
nano demo.properties  # فقط port ها و domain ها رو عوض کن
sudo bash deploy.sh demo.properties deploy
```

✅ **خیلی راحت!**

---

## 📊 جدول مقایسه

| ویژگی | marketplace-deploy.sh | deploy.sh |
|-------|----------------------|-----------|
| Configuration | Hard-coded | External file |
| Multi-environment | ❌ | ✅ |
| Security | Secrets in script | Gitignored file |
| Reusability | ❌ | ✅ |
| PM2 naming | Simple | Mode-aware |
| Nginx config | Single | Per-environment |
| Update safety | ✅ | ✅ |
| SSL preservation | ✅ | ✅ |
| Easy API key management | ❌ | ✅ |
| Maintainability | Low | High |
| Version control friendly | ❌ | ✅ |

---

## 🔄 چرا باید migrate کنم؟

### 1. امنیت بیشتر
Secrets در gitignored files

### 2. انعطاف‌پذیری
Multi-environment بدون دردسر

### 3. قابل نگهداری
Config جدا از logic

### 4. قابل استفاده مجدد
برای پروژه‌های دیگر هم کار می‌کنه

### 5. Clean version control
اسکریپت رو commit می‌کنی، config رو نه

---

## 🎯 نتیجه‌گیری

### marketplace-deploy.sh
- ✅ برای **یک** محیط production خوبه
- ❌ برای چند محیط مناسب نیست
- ❌ Secret management ضعیفه

### deploy.sh
- ✅ برای **چند** محیط عالیه
- ✅ Secret management قوی
- ✅ قابل نگهداری و توسعه
- ✅ Production-ready

---

## 💡 توصیه

اگر:
- فقط یک production دارید و هیچ وقت demo نمی‌خواید → marketplace-deploy.sh کافیه
- می‌خواید demo, staging, production داشته باشید → حتماً به deploy.sh migrate کنید
- می‌خواید secret ها رو بهتر مدیریت کنید → حتماً به deploy.sh migrate کنید
- قراره اسکریپت رو توی git commit کنید → حتماً به deploy.sh migrate کنید

**پیشنهاد ما: Migration به deploy.sh** 🚀











