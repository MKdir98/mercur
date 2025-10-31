# استفاده از SMS در محیط Local/Demo

## تغییرات انجام شده ✅

### 1. هیچ درخواستی به SMS.ir در local/demo
- در محیط local یا demo، سیستم **اصلاً** به SMS.ir درخواست نمی‌فرسته
- کد OTP فقط در console نمایش داده می‌شه
- کد در response API هم برگردونده می‌شه

### 2. Rate Limiting هوشمند
- Rate limiting **فقط بعد از ارسال موفق** SMS اعمال می‌شه
- اگر ارسال SMS خطا بده، می‌تونی بلافاصله دوباره تلاش کنی
- هیچ rate limit ناعادلانه‌ای نداریم!

### 3. API جدید برای دیدن کدها
- یک endpoint جدید برای دیدن لیست تمام کدهای ارسالی
- فقط در local/demo کار می‌کنه
- عالی برای تست و debug

---

## نحوه استفاده

### تنظیم اولیه

فایل `.env` در backend:
```env
APP_ENV=local
```

همین! نیاز به کلید SMS.ir نیست.

---

## روش‌های دیدن کد OTP

### روش 1: Console Backend (ساده‌ترین)

وقتی backend اجراست، هر OTP ارسالی رو می‌بینی:

```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
yarn dev

# خروجی:
📱 [SANDBOX SMS] OTP Code: {
  phone: '09123456789',
  code: '384726',
  expiresAt: '2025-10-30T15:30:00.000Z'
}
```

---

### روش 2: Response API

```bash
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**پاسخ:**
```json
{
  "success": true,
  "message": "کد تایید با موفقیت ارسال شد",
  "messageId": "sandbox_1730303400000",
  "code": "384726"
}
```

توجه: فیلد `code` **فقط** در local/demo هست!

---

### روش 3: API لیست کدها (جدید! 🎉)

برای دیدن **تمام** کدهای ارسالی:

```bash
curl http://localhost:9000/store/auth/sandbox-messages
```

**پاسخ:**
```json
{
  "success": true,
  "count": 3,
  "messages": [
    {
      "phone": "09123456789",
      "code": "384726",
      "timestamp": 1730303400000,
      "expiresAt": 1730303700000
    },
    {
      "phone": "09121112222",
      "code": "925847",
      "timestamp": 1730303350000,
      "expiresAt": 1730303650000
    }
  ]
}
```

این API:
- لیست کدها رو از جدید به قدیم نشون میده
- کدهای بیشتر از 30 دقیقه پاک می‌شن
- فقط در local/demo کار می‌کنه

---

## تست کامل Flow

### سناریو: ثبت نام کاربر جدید

```bash
# 1. ارسال OTP
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# پاسخ:
# {
#   "success": true,
#   "code": "384726"
# }

# 2. دیدن لیست کدها
curl http://localhost:9000/store/auth/sandbox-messages

# 3. تایید OTP
curl -X POST http://localhost:9000/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "384726"}'

# پاسخ:
# {
#   "success": true,
#   "message": "کد تایید با موفقیت تأیید شد"
# }

# 4. ثبت نام
curl -X POST http://localhost:9000/store/auth/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "firstName": "محمد",
    "lastName": "احمدی",
    "isNewUser": true
  }'

# موفق! ✅
```

---

## مزایای Rate Limiting جدید

### قبلاً ❌
```
درخواست 1 → خطای SMS → rate limit! (114 ثانیه صبر!)
درخواست 2 → نمی‌تونی! باید 114 ثانیه صبر کنی
```

### حالا ✅
```
درخواست 1 → خطای SMS → هیچ rate limit!
درخواست 2 → بلافاصله می‌تونی دوباره تلاش کنی
درخواست 3 → موفق! → حالا rate limit اعمال میشه (30 ثانیه)
```

---

## تست Rate Limiting

```bash
# درخواست 1 - موفق
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# درخواست 2 - بلافاصله
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# پاسخ:
# {
#   "success": false,
#   "message": "لطفاً 28 ثانیه صبر کنید قبل از درخواست کد جدید"
# }

# راه حل: صبر کن یا از clear-otp استفاده کن
curl -X POST http://localhost:9000/store/auth/clear-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

---

## Frontend Usage

در frontend می‌تونی از endpoint جدید استفاده کنی:

```typescript
// دریافت لیست کدها
const response = await fetch('http://localhost:9000/store/auth/sandbox-messages')
const data = await response.json()

console.log('آخرین کدها:', data.messages)

// نمایش در UI
data.messages.forEach(msg => {
  console.log(`${msg.phone}: ${msg.code}`)
})
```

---

## Production Safety ✅

### در Production:

- ❌ هیچ کدی در response نیست
- ❌ هیچ کدی در console نیست
- ❌ API sandbox-messages کار نمی‌کنه (404)
- ✅ فقط SMS واقعی ارسال می‌شه
- ✅ Rate limiting عادی (2 دقیقه)
- ✅ امن و آماده برای استفاده

---

## مقایسه Local vs Production

| ویژگی | Local/Demo | Production |
|-------|------------|------------|
| درخواست به SMS.ir | ❌ هیچ | ✅ بله |
| کد در console | ✅ بله | ❌ خیر |
| کد در response | ✅ بله | ❌ خیر |
| API sandbox-messages | ✅ بله | ❌ خیر |
| Rate limiting | 30 ثانیه | 2 دقیقه |
| ارسال SMS واقعی | ❌ خیر | ✅ بله |

---

## Troubleshooting

### مشکل: کد در response نیست

**چک کن:**
```bash
cat .env | grep APP_ENV
```

باید: `APP_ENV=local` یا `APP_ENV=demo`

---

### مشکل: API sandbox-messages 404 میده

این یعنی `APP_ENV` production هست یا تنظیم نشده.

**راه حل:**
```bash
echo "APP_ENV=local" >> .env
# Restart backend
```

---

### مشکل: همچنان به SMS.ir درخواست میره

1. Backend رو restart کن
2. `.env` رو چک کن
3. Cache browser رو پاک کن

---

## دستورات مفید

```bash
# چک کردن محیط
cat .env | grep APP_ENV

# تست ارسال OTP
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# دیدن لیست کدها
curl http://localhost:9000/store/auth/sandbox-messages

# پاک کردن rate limit
curl -X POST http://localhost:9000/store/auth/clear-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# چک کردن backend
curl http://localhost:9000/health
```

---

**تست خوبی داشته باشی! 🚀**





