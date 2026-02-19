# نصب تنظیمات بهینه شده Nginx برای رفع مشکل 503

## تغییرات اعمال شده

### 1. افزایش Keepalive Connections
```nginx
keepalive 256;              # از 64 به 256 افزایش یافت
keepalive_requests 1000;    # اضافه شد
keepalive_timeout 60s;      # اضافه شد
```

### 2. تغییر Connection Header
```nginx
proxy_set_header Connection "";  # از 'upgrade' به "" تغییر کرد
```
این تغییر باعث می‌شود keepalive درست کار کند.

### 3. اضافه کردن Retry Logic
```nginx
proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
proxy_next_upstream_tries 2;
proxy_next_upstream_timeout 10s;
```
اگر backend یکبار 503 داد، دوباره تلاش می‌کند.

### 4. اضافه کردن max_fails
```nginx
server 127.0.0.1:9000 max_fails=3 fail_timeout=30s;
```

## مراحل نصب

### مرحله 1: بکاپ از فایل فعلی
```bash
sudo cp /etc/nginx/sites-available/marketplace-production /etc/nginx/sites-available/marketplace-production.backup.$(date +%Y%m%d_%H%M%S)
```

### مرحله 2: کپی فایل جدید
```bash
sudo cp nginx-optimized.conf /etc/nginx/sites-available/marketplace-production
```

### مرحله 3: تست تنظیمات Nginx
```bash
sudo nginx -t
```

اگر خروجی این بود که "syntax is ok" و "test is successful"، ادامه دهید.

### مرحله 4: بهینه‌سازی تنظیمات سیستمی Nginx
```bash
# باز کردن فایل تنظیمات اصلی nginx
sudo nano /etc/nginx/nginx.conf
```

مطمئن شوید این خطوط وجود دارند (در بخش events و http):

```nginx
events {
    worker_connections 4096;      # اگر کمتر است، افزایش دهید
}

# در بالای فایل، بعد از user
worker_rlimit_nofile 8192;

http {
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # بقیه تنظیمات...
}
```

### مرحله 5: Reload کردن Nginx
```bash
sudo systemctl reload nginx
```

### مرحله 6: بررسی وضعیت
```bash
sudo systemctl status nginx
```

## تست کردن

### تست 1: درخواست ساده
```bash
curl -I https://core.doorfestival.com/health
```

باید 200 OK برگرداند.

### تست 2: درخواست‌های همزمان
```bash
cd /path/to/deploy
bash test-503.sh https://core.doorfestival.com 50 10
```

این اسکریپت 50 درخواست همزمان می‌زند و نتیجه را نشان می‌دهد.

### تست 3: مانیتور کردن لاگ‌ها
در یک ترمینال:
```bash
tail -f /var/log/nginx/backend-production-error.log
```

در ترمینال دیگر:
```bash
tail -f /var/log/nginx/backend-production-access.log | grep " 503 "
```

حالا صفحه brand.doorfestival.com را refresh کنید و ببینید آیا 503 می‌بینید.

## بهینه‌سازی Backend (اختیاری)

اگر هنوز 503 می‌بینید، PM2 را هم بهینه کنید:

### مرحله 1: ویرایش ecosystem.config.js
```bash
sudo nano /path/to/deploy/ecosystem.config.js
```

در بخش backend، این تغییرات را اعمال کنید:

```javascript
{
  name: 'backend-production',
  // ...
  env: {
    NODE_ENV: 'production',
    PORT: 9000,
    UV_THREADPOOL_SIZE: 128  // اضافه کنید
  },
  kill_timeout: 5000,        // اضافه کنید
  listen_timeout: 10000,     // اضافه کنید
  // ...
}
```

### مرحله 2: Restart کردن Backend
```bash
cd /path/to/deploy
pm2 restart backend-production
```

### مرحله 3: بررسی وضعیت
```bash
pm2 status
pm2 logs backend-production --lines 50
```

## مانیتورینگ

### دستورات مفید برای بررسی:

```bash
# تعداد connection های فعال به backend
netstat -an | grep ":9000" | grep ESTABLISHED | wc -l

# وضعیت PM2
pm2 status

# لاگ‌های زنده
pm2 logs backend-production

# استفاده از منابع
htop

# تست سلامت
curl -I http://localhost:9000/health
```

## اگر مشکل حل نشد

### 1. افزایش تعداد Instance های Backend
```javascript
// در ecosystem.config.js
instances: 2,           // به جای 1
exec_mode: 'cluster',   // به جای 'fork'
```

### 2. بررسی Database Connection Pool
در فایل `.env` بک‌اند:
```bash
DATABASE_POOL_MAX=20
```

### 3. بررسی Redis
```bash
redis-cli ping
redis-cli info stats
```

### 4. اجرای Diagnostics
```bash
sudo bash deploy.sh production.properties diagnose
```

## برگشت به تنظیمات قبلی

اگر مشکلی پیش آمد:

```bash
# پیدا کردن آخرین بکاپ
ls -la /etc/nginx/sites-available/marketplace-production.backup.*

# برگرداندن بکاپ
sudo cp /etc/nginx/sites-available/marketplace-production.backup.YYYYMMDD_HHMMSS /etc/nginx/sites-available/marketplace-production

# تست و reload
sudo nginx -t
sudo systemctl reload nginx
```

## نکات مهم

1. **Connection Header**: تغییر از `'upgrade'` به `""` برای keepalive ضروری است
2. **Keepalive Count**: افزایش از 64 به 256 برای handle کردن load بیشتر
3. **Retry Logic**: اضافه کردن `proxy_next_upstream` برای retry خودکار
4. **Timeouts**: timeout های کافی برای API های کند

## پشتیبانی

اگر بعد از این تغییرات هنوز مشکل دارید:

1. لاگ‌های nginx را بررسی کنید
2. لاگ‌های PM2 را بررسی کنید  
3. منابع سیستم (CPU, Memory, Disk) را چک کنید
4. Database slow query log را بررسی کنید
5. اسکریپت test-503.sh را اجرا کنید

برای اطلاعات بیشتر: `TROUBLESHOOTING-503.md`
