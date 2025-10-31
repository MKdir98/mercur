# 🔒 SSL-Safe Deployment Guide

## مشکل قبلی

قبلاً وقتی `deploy` عادی می‌زدید، تنظیمات SSL از nginx حذف می‌شد و باید دوباره `ssl` را اجرا می‌کردید.

## راه حل جدید ✅

### دستور جدید: `update`

دستور `update` برای **به‌روزرسانی کد بدون دست زدن به SSL** طراحی شده است.

```bash
sudo bash marketplace-deploy.sh update
```

#### چه کاری انجام می‌دهد:
✅ کد را از git می‌کشد (git pull)
✅ پروژه‌ها را build می‌کند
✅ سرویس‌های PM2 را restart می‌کند
✅ **تنظیمات Nginx/SSL را دست نمی‌زند**

---

## راهنمای کامل

### اولین بار (Initial Setup):

```bash
# 1. دیپلوی اولیه
sudo bash marketplace-deploy.sh deploy

# 2. نصب SSL
sudo bash marketplace-deploy.sh ssl
```

### به‌روزرسانی کد (پس از نصب SSL):

```bash
# فقط کد را update کنید (SSL سالم می‌ماند)
sudo bash marketplace-deploy.sh update
```

### دیپلوی کامل دوباره:

اگر می‌خواهید **همه چیز** را دوباره نصب کنید:

```bash
# دیپلوی کامل (nginx config را دوباره می‌نویسد)
sudo bash marketplace-deploy.sh deploy

# اگر SSL داشتید، دوباره نصب کنید
sudo bash marketplace-deploy.sh ssl
```

**نکته**: تابع `setup_nginx()` اکنون هوشمند شده است:
- اگر SSL در nginx config موجود باشد، آن را **preserve می‌کند**
- پیغام می‌دهد که config SSL دارد و دست نمی‌زند

---

## مقایسه دستورات

| دستور | کد را Update می‌کند | Build می‌کند | Nginx Config | SSL | زمان اجرا |
|-------|---------------------|--------------|--------------|-----|-----------|
| `update` | ✅ | ✅ | ❌ دست نمی‌زند | ✅ سالم می‌ماند | سریع (~5-10 دقیقه) |
| `deploy` | ✅ | ✅ | ✅ دوباره می‌نویسد | ⚠️ حفظ می‌شود اگر موجود باشد | کامل (~15-20 دقیقه) |
| `ssl` | ❌ | ❌ | ✅ SSL اضافه می‌کند | ✅ نصب می‌کند | سریع (~2-5 دقیقه) |

---

## سناریوهای معمول

### 1️⃣ تغییرات کد backend یا frontend:
```bash
sudo bash marketplace-deploy.sh update
```

### 2️⃣ تغییر در environment variables:
```bash
# فایل .env را ویرایش کنید
nano /var/www/marketplace/mercur/apps/backend/.env

# سپس update بزنید
sudo bash marketplace-deploy.sh update
```

### 3️⃣ مشکل در nginx یا SSL:
```bash
# config nginx را پاک کنید
sudo rm /etc/nginx/sites-available/marketplace
sudo rm /etc/nginx/sites-enabled/marketplace

# دوباره deploy کنید
sudo bash marketplace-deploy.sh deploy

# SSL را دوباره نصب کنید
sudo bash marketplace-deploy.sh ssl
```

### 4️⃣ فقط restart سرویس‌ها (بدون build):
```bash
pm2 restart all
```

---

## دستورات مفید PM2

```bash
# مشاهده وضعیت
pm2 status

# مشاهده لاگ‌ها
pm2 logs

# مشاهده لاگ یک سرویس خاص
pm2 logs backend
pm2 logs storefront
pm2 logs vendor-panel

# restart یک سرویس خاص
pm2 restart backend

# مانیتورینگ real-time
pm2 monit
```

---

## نکات امنیتی

- ✅ دستور `update` nginx را دست نمی‌زند، پس SSL سالم می‌ماند
- ✅ دستور `deploy` اگر SSL موجود باشد، آن را preserve می‌کند
- ⚠️ فقط در صورت نیاز به تنظیمات مجدد nginx، config را پاک کنید
- 🔒 Certificate‌های SSL همیشه در `/etc/letsencrypt/` باقی می‌مانند

---

## خلاصه برای کاربران عجول 😄

**بعد از نصب SSL، همیشه از `update` استفاده کنید:**

```bash
sudo bash marketplace-deploy.sh update
```

این دستور کد شما را update می‌کند بدون اینکه SSL را خراب کند! 🎉

