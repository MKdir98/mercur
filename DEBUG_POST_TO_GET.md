# 🐛 Debug: چرا POST به GET تبدیل میشه؟

## مشکل
Frontend: POST می‌فرسته
Backend Log: GET دریافت می‌کنه
Nginx Log: GET ثبت میشه

## علت‌های احتمالی

### 1. HTTP → HTTPS Redirect (متداول‌ترین!)

وقتی:
- Frontend به `http://` می‌فرسته
- Nginx یک redirect 301/302 به `https://` میده
- Browser به‌طور خودکار POST رو به GET تبدیل می‌کنه!

**راه حل:**
```typescript
// در frontend .env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://core.doorfestival.com  // نه http://
```

### 2. Trailing Slash Redirect

وقتی:
- Frontend به `/store/auth/send-otp/` می‌فرسته (با slash آخر)
- Nginx redirect به `/store/auth/send-otp` میده (بدون slash)
- POST → GET تبدیل میشه

**راه حل:**
```nginx
# در nginx config
location /store {
    # Disable automatic trailing slash redirect
    merge_slashes off;
    
    proxy_pass http://backend;
}
```

### 3. Rate Limiting با Redirect

اگر Nginx rate limit رو exceed کنید، ممکنه redirect بده.

## 🔍 چک کردن مشکل

### تست 1: مستقیم به Backend (بدون Nginx)
```bash
# از داخل سرور
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

✅ اگر کار کرد: مشکل از Nginx هستش
❌ اگر کار نکرد: مشکل از Backend هستش

### تست 2: با HTTP
```bash
curl -X POST http://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}' \
  -v  # verbose mode
```

به خط‌های شبیه اینا دقت کنید:
```
< HTTP/1.1 301 Moved Permanently
< Location: https://core.doorfestival.com/store/auth/send-otp
```

### تست 3: با HTTPS
```bash
curl -X POST https://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}' \
  -v
```

✅ اگر این کار کرد: یعنی باید frontend به HTTPS بفرسته

## 📝 بررسی Frontend Config

```bash
# چک کردن env در production
cd /var/www/marketplace/b2c-marketplace-storefront
cat .env.production | grep BACKEND_URL
```

باید ببینید:
```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://core.doorfestival.com  # HTTPS ✅
# نه
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://core.doorfestival.com   # HTTP ❌
```

## 🔧 راه‌حل‌های احتمالی

### راه‌حل 1: تغییر URL در Frontend
```bash
# ویرایش .env.production
nano /var/www/marketplace/b2c-marketplace-storefront/.env.production

# تغییر بدید به HTTPS:
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://core.doorfestival.com
MEDUSA_BACKEND_URL=https://core.doorfestivel.com

# Rebuild و restart
cd /var/www/marketplace
sudo bash deploy/marketplace-deploy.sh update
```

### راه‌حل 2: Nginx Config برای حفظ POST Method

اگر Nginx داره redirect می‌کنه، باید بهش بگیم POST رو حفظ کنه:

```nginx
# در /etc/nginx/sites-available/marketplace
server {
    listen 80;
    server_name core.doorfestival.com;
    
    # IMPORTANT: Use 307 or 308 (not 301 or 302) to preserve POST
    return 307 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name core.doorfestival.com;
    
    # ... SSL config ...
    
    location / {
        proxy_pass http://backend;
        # ... rest of config ...
    }
}
```

**تفاوت Status Codes:**
- `301/302` → POST تبدیل به GET میشه ❌
- `307/308` → POST حفظ میشه ✅

### راه‌حل 3: HSTS Preload

اگر domain شما در HSTS preload list هست:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

باید همیشه از HTTPS استفاده کنید.

## 🎯 Quick Fix

**سریع‌ترین راه حل:**

```bash
# 1. چک کنید backend URL چیه
cd /var/www/marketplace/b2c-marketplace-storefront
grep BACKEND_URL .env.production

# 2. اگر http:// هست، تغییر بدید به https://
sed -i 's|http://core.doorfestival.com|https://core.doorfestival.com|g' .env.production

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart storefront
```

## 📊 چک کردن Nginx Logs با جزئیات بیشتر

```bash
# تغییر log format برای دیدن بیشتر جزئیات
sudo nano /etc/nginx/nginx.conf

# اضافه کنید:
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'upstream: $upstream_addr '
                    'upstream_status: $upstream_status '
                    'request_time: $request_time '
                    'upstream_response_time: $upstream_response_time';

access_log /var/log/nginx/backend-access.log detailed;

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

حالا در log می‌بینید که آیا redirect اتفاق افتاده یا نه.

