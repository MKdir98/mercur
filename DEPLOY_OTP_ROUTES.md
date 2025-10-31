# 🚀 دیپلوی Route های OTP به Production

## مشکل
Route های OTP در production کار نمی‌کنن و 404 میدن چون backend build/restart نشده.

## ✅ راه حل

### روش 1: اگر از Docker استفاده می‌کنید

```bash
# 1. کد جدید رو pull کنید
cd /home/mehdi/all/repositories/github.com/mercur
git pull origin main

# 2. Backend رو rebuild کنید
docker compose build backend

# 3. سرویس رو restart کنید
docker compose restart backend

# یا اگر می‌خواید همه رو restart کنید:
docker compose down
docker compose up -d
```

### روش 2: اگر مستقیم روی سرور اجرا می‌کنید

```bash
# 1. کد جدید رو pull کنید
cd /home/mehdi/all/repositories/github.com/mercur
git pull origin main

# 2. Dependencies رو install کنید (در صورت نیاز)
yarn install

# 3. Backend رو rebuild کنید
cd apps/backend
yarn build

# 4. سرویس رو restart کنید
pm2 restart backend
# یا
systemctl restart medusa-backend
# یا اگر از screen/tmux استفاده می‌کنید، process رو kill و دوباره start کنید
```

### روش 3: اگر از Deployment Platform استفاده می‌کنید (Vercel, Railway, etc)

1. کد رو push کنید:
```bash
git push origin main
```

2. Platform خودکار rebuild و deploy می‌کنه
3. اگر خودکار نیست، از dashboard platform یک redeploy کنید

## 🔍 چک کردن Route ها بعد از Deploy

```bash
# تست send-otp
curl -X POST https://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# تست verify-otp
curl -X POST https://core.doorfestival.com/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "123456"}'

# چک کردن شماره تلفن
curl -X GET https://core.doorfestival.com/store/customers/phone/09123456789
```

## 📋 Route های OTP که باید کار کنن

- ✅ `POST /store/auth/send-otp` - ارسال کد OTP
- ✅ `POST /store/auth/verify-otp` - تایید کد OTP  
- ✅ `POST /store/auth/phone` - لاگین با شماره تلفن
- ✅ `POST /store/auth/login` - لاگین با شماره + رمز
- ✅ `GET /store/customers/phone/:phone` - چک کردن وجود شماره
- ✅ `GET /store/auth/sandbox-messages` - پیام‌های SMS (فقط local/demo)

## ⚠️ نکات مهم

1. **حتماً rebuild کنید** - فقط restart کافی نیست!
2. **Environment variables** رو چک کنید - مطمئن بشید که SMS_IR API key در production هست
3. **APP_ENV** رو در production به `production` تنظیم کنید (نه `local` یا `demo`)

## 🐛 اگر باز هم 404 می‌گیرید

1. چک کنید که Git changes commit و push شده باشن:
```bash
git status
git log --oneline -5
```

2. لاگ های backend رو بررسی کنید:
```bash
# Docker
docker compose logs backend --tail=100 -f

# PM2
pm2 logs backend --lines 100

# Systemd
journalctl -u medusa-backend -n 100 -f
```

3. مطمئن بشید که route files در build هستن:
```bash
# چک کردن built routes
ls -la apps/backend/.medusa/server/src/api/store/auth/
```

4. اگر Medusa admin داشته باشید، از API routes در admin چک کنید

