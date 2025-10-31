# راهنمای فایل‌های کانفیگ نمونه

این دایرکتوری شامل چند فایل نمونه برای تنظیمات مختلف است.

## فایل‌های موجود

### 1. `demo.properties` ✅
فایل کانفیگ اصلی برای محیط Demo
- آماده استفاده
- باید API key ها و پسوردها رو عوض کنی

### 2. `production.properties` ✅
فایل کانفیگ اصلی برای محیط Production
- آماده استفاده
- حتما باید همه کلیدها رو عوض کنی

### 3. `demo.properties.example` 📝
فایل نمونه کامل با توضیحات فارسی
- شامل توضیحات کامل هر فیلد
- راهنمای دریافت API key ها
- نکات امنیتی
- استفاده: `cp demo.properties.example my-config.properties`

### 4. `demo-minimal.properties.example` 📝
فایل نمونه ساده و خلاصه
- فقط شامل فیلدهای ضروری
- بدون توضیحات اضافی
- برای کاربران حرفه‌ای
- استفاده: `cp demo-minimal.properties.example my-config.properties`

## نحوه استفاده

### روش ۱: استفاده مستقیم از فایل‌های موجود

```bash
# ویرایش فایل دمو
nano demo.properties

# دیپلوی
sudo bash deploy.sh demo.properties deploy
```

### روش ۲: ساخت کانفیگ شخصی از روی نمونه کامل

```bash
# کپی فایل نمونه با توضیحات
cp demo.properties.example my-demo.properties

# ویرایش
nano my-demo.properties

# دیپلوی
sudo bash deploy.sh my-demo.properties deploy
```

### روش ۳: ساخت کانفیگ شخصی از روی نمونه ساده

```bash
# کپی فایل نمونه ساده
cp demo-minimal.properties.example staging.properties

# ویرایش
nano staging.properties

# دیپلوی
sudo bash deploy.sh staging.properties deploy
```

## مقادیر ضروری که باید تغییر کنند

### 🔴 حتماً باید عوض شوند:

1. **پسوردها**
   - `DB_PASSWORD` - پسورد دیتابیس
   - `REVALIDATE_SECRET` - کلید revalidation

2. **Stripe Keys** (اگر از Stripe استفاده می‌کنی)
   - `STRIPE_PUBLIC_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

3. **API Keys** (اگر از این سرویس‌ها استفاده می‌کنی)
   - `RESEND_API_KEY` - برای ایمیل
   - `ALGOLIA_*` - برای جستجو
   - `TALKJS_*` - برای چت
   - `SMS_IR_API_KEY` - برای پیامک

### 🟡 احتمالاً باید عوض شوند:

1. **Domains** - دامنه‌های خودت
   - `STOREFRONT_DOMAIN`
   - `BACKEND_DOMAIN`
   - `VENDOR_DOMAIN`

2. **Ports** - اگر پورت‌ها occupied هستند
   - `STOREFRONT_PORT`
   - `BACKEND_PORT`
   - `VENDOR_PORT`

3. **Database Info**
   - `DB_NAME`
   - `DB_USER`

### 🟢 معمولاً نیازی به تغییر ندارند:

- `GITHUB_USERNAME` - اگر ریپوها در همون اکانت هستند
- `REDIS_URL` - اگر Redis روی همون سرور است
- `DEFAULT_REGION`
- `DEPLOY_DIR` - مگر اینکه مسیر دیگه‌ای میخوای

## تولید مقادیر امن

### پسورد تصادفی:
```bash
openssl rand -base64 32
```

### Secret Key تصادفی:
```bash
openssl rand -hex 32
```

### UUID:
```bash
uuidgen
```

## چک‌لیست قبل از دیپلوی

- [ ] همه مقادیر "CHANGE_ME" عوض شده‌اند
- [ ] همه مقادیر "your_xxx_here" عوض شده‌اند
- [ ] پسورد دیتابیس قوی است (حداقل 16 کاراکتر)
- [ ] برای demo از test keys استفاده شده (pk_test_, sk_test_)
- [ ] برای production از live keys استفاده شده (pk_live_, sk_live_)
- [ ] DNS record ها آماده هستند (برای SSL)
- [ ] پورت‌ها با environment های دیگر تداخل ندارند
- [ ] دامنه‌ها صحیح هستند

## مثال: Setup سریع Demo

```bash
# 1. کپی فایل ساده
cp demo-minimal.properties.example quick-demo.properties

# 2. ویرایش سریع (فقط ضروری‌ها)
nano quick-demo.properties
# - DB_PASSWORD را عوض کن
# - اگر نیاز نیست، Stripe و Algolia رو همینطوری بذار

# 3. دیپلوی
sudo bash deploy.sh quick-demo.properties deploy

# 4. وقتی پرسید SSL میخوای؟
#    - اگر DNS آماده است: y
#    - اگر نه: n
```

## مثال: Setup Production با همه سرویس‌ها

```bash
# 1. کپی فایل کامل با توضیحات
cp demo.properties.example production-full.properties

# 2. ویرایش کامل (بخون توضیحات و همه رو پر کن)
nano production-full.properties

# 3. چک کن همه چیز درست است
grep "CHANGE_ME" production-full.properties  # نباید چیزی پیدا کنه
grep "your_" production-full.properties      # نباید چیزی پیدا کنه

# 4. دیپلوی
sudo bash deploy.sh production-full.properties deploy

# 5. Setup SSL (حتما DNS آماده باشه)
# وقتی پرسید: y
```

## نکات امنیتی

⚠️ **مهم:**

1. **هرگز فایل‌های .properties واقعی رو commit نکن**
   ```bash
   # اضافه کن به .gitignore:
   *.properties
   !*.properties.example
   ```

2. **دسترسی محدود به فایل‌های کانفیگ**
   ```bash
   chmod 600 *.properties
   ```

3. **Backup از فایل‌های کانفیگ**
   ```bash
   cp production.properties production.properties.backup
   ```

4. **استفاده از test keys برای demo**
   - Demo: `pk_test_...`, `sk_test_...`
   - Production: `pk_live_...`, `sk_live_...`

## دستورات مفید

```bash
# مشاهده همه فایل‌های properties
ls -la *.properties*

# جستجوی مقادیری که باید عوض شوند
grep -E "CHANGE_ME|your_.*_here" *.properties

# مقایسه دو فایل کانفیگ
diff demo.properties production.properties

# Validate syntax (چک کن خط‌های خالی و کامنت‌ها درست هستند)
grep -v "^#" demo.properties | grep -v "^$"
```

## دریافت API Keys

### Stripe
- Test Keys: https://dashboard.stripe.com/test/apikeys
- Live Keys: https://dashboard.stripe.com/apikeys
- Webhooks: https://dashboard.stripe.com/webhooks

### Resend (Email)
- API Keys: https://resend.com/api-keys

### Algolia (Search)
- Dashboard: https://www.algolia.com/dashboard
- API Keys: https://www.algolia.com/account/api-keys

### TalkJS (Chat)
- Dashboard: https://talkjs.com/dashboard
- App ID و Secret Key: Settings → API Keys

### SMS.ir (پیامک ایران)
- پنل: https://app.sms.ir
- API Key: تنظیمات → کلید API
- Template: پیامک‌های قالبی → ساخت قالب جدید

## پشتیبانی

اگر سوالی داشتی:
1. فایل `deploy.sh` رو اجرا کن بدون آرگومان: `bash deploy.sh`
2. لاگ‌ها رو چک کن: `pm2 logs`
3. مستندات کامل: `MODULAR-DEPLOY-README.md`


