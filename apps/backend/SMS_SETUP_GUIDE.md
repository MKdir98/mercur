# راهنمای کامل تنظیم SMS.ir برای احراز هویت

این راهنما نحوه تنظیم و استفاده از سیستم SMS.ir برای ارسال کدهای OTP در فرآیند احراز هویت را توضیح می‌دهد.

## 📋 فهرست مطالب

1. [دریافت کلیدهای SMS.ir](#1-دریافت-کلیدهای-smsir)
2. [تنظیم Template در SMS.ir](#2-تنظیم-template-در-smsir)
3. [پیکربندی Backend](#3-پیکربندی-backend)
4. [تست در محیط Local](#4-تست-در-محیط-local)
5. [Deploy در Production](#5-deploy-در-production)
6. [تست کامل Flow](#6-تست-کامل-flow)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. دریافت کلیدهای SMS.ir

### مرحله 1: ورود به پنل SMS.ir

1. وارد [پنل SMS.ir](https://app.sms.ir) شوید
2. حساب کاربری خود را بسازید یا وارد شوید

### مرحله 2: دریافت API Key

1. در منوی سمت چپ، روی **"توسعه دهندگان"** کلیک کنید
2. کلید API خود را کپی کنید
3. این کلید را در جای امنی ذخیره کنید

### مرحله 3: دریافت شماره خط

1. در منوی **"ارسال"** → **"خطوط من"** 
2. شماره خط خود را یادداشت کنید (معمولاً 10 رقمی است)

---

## 2. تنظیم Template در SMS.ir

### مرحله 1: ساخت Template

1. در منوی سمت چپ، **"ارسال"** → **"الگو (Pattern)"**
2. روی **"ایجاد الگوی جدید"** کلیک کنید

### مرحله 2: محتوای Template

در قسمت متن، این محتوا را وارد کنید:

```
کد تایید شما: %CODE%

این کد تا 5 دقیقه معتبر است.
```

**نکات مهم:**
- نام پارامتر باید دقیقاً `CODE` باشد (با حروف بزرگ)
- از علامت `%` در دو طرف نام پارامتر استفاده کنید
- متن می‌تواند به فارسی باشد

### مرحله 3: ذخیره و دریافت Template ID

1. روی **"ذخیره"** کلیک کنید
2. بعد از تایید SMS.ir، شناسه الگو (Template ID) به شما نمایش داده می‌شود
3. این شناسه را یادداشت کنید (عدد است)

---

## 3. پیکربندی Backend

### روش 1: استفاده از اسکریپت Deploy

اگر از اسکریپت deploy استفاده می‌کنید، فایل `.env` را به صورت دستی ویرایش کنید:

```bash
cd /var/www/marketplace/mercur/apps/backend
nano .env
```

### روش 2: تنظیم دستی

فایل `.env` در مسیر `apps/backend/.env` را ویرایش کنید:

```env
# Environment (مهم!)
APP_ENV=production  # یا local یا demo

# SMS.ir Configuration (PRODUCTION)
SMS_IR_API_KEY=your_actual_api_key_here
SMS_IR_LINE_NUMBER=30007732999999  # مثال
SMS_IR_TEMPLATE_ID=123456  # شناسه الگو

# SMS.ir Sandbox (برای تست)
SMS_IR_SANDBOX_API_KEY=sandbox_key
SMS_IR_SANDBOX_LINE_NUMBER=sandbox_line
```

### مقادیر مثال:

```env
# Production Example
APP_ENV=production
SMS_IR_API_KEY=sk_live_abc123def456...
SMS_IR_LINE_NUMBER=30007732999999
SMS_IR_TEMPLATE_ID=789012

# Local Example
APP_ENV=local
SMS_IR_SANDBOX_API_KEY=sandbox_key
SMS_IR_SANDBOX_LINE_NUMBER=sandbox_line
SMS_IR_TEMPLATE_ID=789012
```

---

## 4. تست در محیط Local

### مرحله 1: تنظیم محیط Local

```bash
cd apps/backend
cp .env.example .env
```

ویرایش `.env`:

```env
APP_ENV=local
SMS_IR_SANDBOX_API_KEY=sandbox_key
SMS_IR_SANDBOX_LINE_NUMBER=sandbox_line
SMS_IR_TEMPLATE_ID=your_template_id
```

**در حالت `local`:**
- SMS واقعی ارسال نمی‌شود
- کد OTP در console نمایش داده می‌شود
- می‌توانید از sandbox endpoint برای دریافت کدها استفاده کنید

### مرحله 2: اجرای Backend

```bash
yarn install
yarn dev
```

### مرحله 3: تست API Endpoints

#### 1. ارسال OTP

```bash
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**پاسخ موفق:**
```json
{
  "success": true,
  "message": "کد تایید با موفقیت ارسال شد",
  "messageId": "sandbox_1234567890",
  "code": "123456"
}
```

#### 2. تایید OTP

```bash
curl -X POST http://localhost:9000/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "123456"}'
```

**پاسخ موفق:**
```json
{
  "success": true,
  "message": "کد تایید با موفقیت تأیید شد"
}
```

#### 3. چک کردن شماره تلفن

```bash
curl -X GET http://localhost:9000/store/customers/phone/09123456789 \
  -H "x-publishable-api-key: YOUR_KEY"
```

**پاسخ اگر کاربر وجود داشته باشد:**
```json
{
  "customer": {
    "first_name": "محمد",
    "last_name": "احمدی"
  }
}
```

**پاسخ اگر کاربر وجود نداشته باشد:**
```json
{
  "customer": null
}
```

#### 4. لاگین با شماره تلفن

```bash
# برای کاربر جدید
curl -X POST http://localhost:9000/store/auth/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "firstName": "محمد",
    "lastName": "احمدی",
    "isNewUser": true
  }'

# برای کاربر موجود
curl -X POST http://localhost:9000/store/auth/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "isNewUser": false
  }'
```

---

## 5. Deploy در Production

### مرحله 1: استفاده از اسکریپت Deploy

```bash
cd /path/to/mercur/deploy
sudo bash marketplace-deploy.sh deploy
```

### مرحله 2: ویرایش فایل .env در Production

بعد از اجرای اسکریپت، فایل `.env` را ویرایش کنید:

```bash
nano /var/www/marketplace/mercur/apps/backend/.env
```

مقادیر زیر را با کلیدهای واقعی جایگزین کنید:

```env
APP_ENV=production

# کلیدهای واقعی SMS.ir
SMS_IR_API_KEY=sk_live_your_actual_key
SMS_IR_LINE_NUMBER=30007732999999
SMS_IR_TEMPLATE_ID=789012
```

### مرحله 3: Restart سرویس‌ها

```bash
cd /var/www/marketplace
pm2 restart backend
```

### مرحله 4: بررسی Logs

```bash
pm2 logs backend
```

---

## 6. تست کامل Flow

### سناریو 1: ثبت نام کاربر جدید

```bash
# 1. ارسال OTP
curl -X POST https://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# 2. تایید OTP (با کدی که به گوشی آمده)
curl -X POST https://core.doorfestival.com/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "123456"}'

# 3. تکمیل ثبت نام
curl -X POST https://core.doorfestival.com/store/auth/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "firstName": "محمد",
    "lastName": "احمدی",
    "isNewUser": true
  }'
```

### سناریو 2: لاگین کاربر موجود

```bash
# 1. ارسال OTP
curl -X POST https://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# 2. تایید OTP
curl -X POST https://core.doorfestival.com/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "654321"}'

# 3. لاگین
curl -X POST https://core.doorfestival.com/store/auth/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "isNewUser": false
  }'
```

### تست از طریق Frontend

1. باز کردن صفحه ثبت نام: `https://doorfestival.com/register`
2. وارد کردن شماره تلفن
3. دریافت کد OTP
4. وارد کردن کد 6 رقمی
5. تکمیل اطلاعات (نام و نام خانوادگی)
6. ورود به حساب کاربری

---

## 7. Troubleshooting

### خطا: "خطا در ارسال پیامک"

**علل احتمالی:**
1. API Key اشتباه است
2. شماره خط اشتباه است
3. Template ID اشتباه است
4. اعتبار حساب SMS.ir تمام شده

**راه حل:**
```bash
# بررسی logs
pm2 logs backend

# بررسی environment variables
cd /var/www/marketplace/mercur/apps/backend
cat .env | grep SMS_IR
```

### خطا: "کد تایید یافت نشد"

**علت:** OTP منقضی شده یا ارسال نشده

**راه حل:**
```bash
# دوباره کد جدید درخواست دهید
curl -X POST https://core.doorfestival.com/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

### SMS واقعی ارسال نمی‌شود

**بررسی APP_ENV:**
```bash
cat /var/www/marketplace/mercur/apps/backend/.env | grep APP_ENV
```

باید `production` باشد، نه `local` یا `demo`

### بررسی اینکه همه چیز درست کار می‌کند

```bash
# 1. بررسی backend در حال اجراست
pm2 status

# 2. بررسی logs
pm2 logs backend --lines 50

# 3. تست endpoint
curl http://localhost:9000/health

# 4. بررسی env variables
printenv | grep SMS_IR
```

---

## 📝 نکات امنیتی

1. **هرگز کلیدهای API را در Git commit نکنید**
2. **از `.env` برای ذخیره کلیدها استفاده کنید**
3. **در production، `APP_ENV=production` باشد**
4. **Rate limiting را فعال نگه دارید**
5. **OTP expiration را بر روی 5 دقیقه نگه دارید**

---

## 🎯 Checklist قبل از Production

- [ ] کلیدهای SMS.ir از پنل دریافت شده
- [ ] Template با پارامتر `CODE` ساخته شده
- [ ] فایل `.env` با کلیدهای واقعی تنظیم شده
- [ ] `APP_ENV=production` در .env
- [ ] Backend restart شده (`pm2 restart backend`)
- [ ] تست ارسال SMS با شماره واقعی انجام شده
- [ ] Frontend به backend متصل است
- [ ] Rate limiting تست شده
- [ ] Logs بررسی شده (هیچ خطایی وجود ندارد)

---

## 🆘 پشتیبانی

اگر با مشکلی مواجه شدید:

1. Logs را بررسی کنید: `pm2 logs backend`
2. Environment variables را چک کنید
3. به [مستندات SMS.ir](https://docs.sms.ir) مراجعه کنید
4. به تیم توسعه اطلاع دهید

---

## 📚 منابع

- [SMS.ir Dashboard](https://app.sms.ir)
- [SMS.ir Documentation](https://docs.sms.ir)
- [Backend API Documentation](./README.md)





