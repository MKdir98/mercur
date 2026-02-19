# راهنمای سریع اعمال تغییرات

## مشکل شما:
مشکل شما **503 نیست**، بلکه **Rate Limiting** است!

در لاگ nginx می‌بینید:
```
limiting requests, excess: 30.800 by zone "api_limit_production"
```

وقتی vendor panel باز می‌شود، یکباره 10+ درخواست همزمان به backend می‌زند و از rate limit عبور می‌کند.

## تغییرات اعمال شده در deploy.sh:

### 1. افزایش Rate Limits:
- **API**: از `10r/s` به `50r/s` افزایش یافت
- **General**: از `30r/s` به `100r/s` افزایش یافت

### 2. افزایش Burst:
- **API burst**: از `30` به `100` افزایش یافت
- **General burst**: از `20` به `50` افزایش یافت

### 3. تصحیح Connection Header:
- از `Connection 'upgrade'` به `Connection ""` تغییر کرد (برای keepalive)

### 4. افزایش Keepalive:
- از `64` به `256` افزایش یافت

## مراحل اعمال:

### روش 1: استفاده از deploy.sh (توصیه می‌شود)

```bash
cd ~/doorfestival

# بکاپ از کانفیگ فعلی nginx
sudo cp /etc/nginx/sites-available/marketplace-production \
     /etc/nginx/sites-available/marketplace-production.backup.$(date +%Y%m%d_%H%M%S)

# حذف کانفیگ فعلی تا deploy.sh دوباره بسازد
sudo rm /etc/nginx/sites-available/marketplace-production

# اجرای deploy (فقط nginx را دوباره می‌سازد)
sudo bash deploy.sh production.properties deploy

# یا اگر نمی‌خواهید همه چیز را redeploy کنید:
# فقط بخش setup_nginx را دستی اجرا کنید
```

### روش 2: ویرایش دستی فایل nginx فعلی

```bash
# ویرایش فایل
sudo nano /etc/nginx/sites-available/marketplace-production
```

**تغییرات مورد نیاز:**

#### 1. در بخش Rate limiting zones (خط ~20):
```nginx
# قبل:
limit_req_zone $binary_remote_addr zone=api_limit_production:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit_production:10m rate=30r/s;

# بعد:
limit_req_zone $binary_remote_addr zone=api_limit_production:10m rate=50r/s;
limit_req_zone $binary_remote_addr zone=general_limit_production:10m rate=100r/s;
```

#### 2. در بخش Upstream definitions (خط ~5):
```nginx
# قبل:
upstream backend_production {
    server 127.0.0.1:9000;
    keepalive 64;
}

# بعد:
upstream backend_production {
    server 127.0.0.1:9000 max_fails=3 fail_timeout=30s;
    keepalive 256;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}
```

همین کار را برای `storefront_production` هم انجام دهید.

#### 3. در بخش Backend API location (خط ~100):
```nginx
# قبل:
limit_req zone=api_limit_production burst=30 nodelay;
proxy_set_header Connection 'upgrade';

# بعد:
limit_req zone=api_limit_production burst=100 nodelay;
proxy_set_header Connection "";
```

#### 4. اضافه کردن retry logic در backend location:
```nginx
# در انتهای location / برای backend، قبل از }:
proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
proxy_next_upstream_tries 2;
proxy_next_upstream_timeout 10s;
```

#### 5. در بخش Storefront location (خط ~50):
```nginx
# قبل:
limit_req zone=general_limit_production burst=20 nodelay;
proxy_set_header Connection 'upgrade';

# بعد:
limit_req zone=general_limit_production burst=50 nodelay;
proxy_set_header Connection "";
```

#### 6. در بخش Vendor Panel location (خط ~150):
```nginx
# قبل:
limit_req zone=general_limit_production burst=20 nodelay;
proxy_set_header Connection 'upgrade';

# بعد:
limit_req zone=general_limit_production burst=50 nodelay;
proxy_set_header Connection "";
```

### بعد از ویرایش:

```bash
# تست کانفیگ
sudo nginx -t

# اگر OK بود، reload کنید
sudo systemctl reload nginx

# بررسی وضعیت
sudo systemctl status nginx
```

## تست کردن:

```bash
# 1. باز کردن vendor panel
# در مرورگر: https://brand.doorfestival.com

# 2. مانیتور کردن لاگ
tail -f /var/log/nginx/backend-production-error.log

# 3. باید دیگر پیغام "limiting requests" نبینید!
```

## اگر هنوز مشکل دارید:

```bash
# بررسی لاگ‌های nginx
sudo tail -100 /var/log/nginx/backend-production-error.log

# بررسی وضعیت backend
pm2 status
pm2 logs backend-production --lines 50

# اجرای diagnostics
sudo bash deploy.sh production.properties diagnose
```

## نکات مهم:

1. **Rate limit افزایش یافت**: از 10 به 50 درخواست در ثانیه
2. **Burst افزایش یافت**: از 30 به 100 برای API
3. **Keepalive بهبود یافت**: از 64 به 256 connection
4. **Connection header تصحیح شد**: برای keepalive درست

این تغییرات باید مشکل شما را کاملاً حل کند! 🎉
