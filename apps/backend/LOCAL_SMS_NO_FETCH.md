# SMS در Local - بدون هیچ Fetch

## چطور کار می‌کنه؟

### در Local/Demo:
1. **هیچ درخواستی به SMS.ir نمیره** - نه production، نه sandbox، هیچی!
2. کد OTP فقط generate میشه و در **memory** ذخیره میشه
3. کد در **console backend** نمایش داده میشه
4. کد در **response API** هم هست
5. کاربر می‌تونه از **API جداگانه** لیست تمام کدها رو ببینه

### در Production:
1. درخواست واقعی به `https://api.sms.ir/v1` میره
2. SMS واقعی ارسال میشه
3. هیچ کدی در response یا console نیست

---

## استفاده

### روش 1: دیدن کد در Console Backend

وقتی backend اجراست:

```bash
yarn dev

# خروجی بعد از ارسال OTP:
📱 [LOCAL SMS - NO FETCH] OTP Code: {
  phone: '09123456789',
  code: '384726',
  expiresAt: '2025-10-30T15:30:00.000Z',
  note: 'کاربر باید از API /store/auth/sandbox-messages کدها رو ببینه'
}
```

---

### روش 2: دیدن کد در Response

```bash
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

**Response:**
```json
{
  "success": true,
  "message": "کد تایید با موفقیت ارسال شد",
  "messageId": "local_1730303400000",
  "code": "384726"
}
```

**توجه:** فیلد `code` فقط در local/demo هست!

---

### روش 3: API مخصوص دیدن کدها (پیشنهادی!)

برای دیدن لیست **تمام** کدهای ارسالی:

```bash
curl http://localhost:9000/store/auth/sandbox-messages
```

**Response:**
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
    },
    {
      "phone": "09199998888",
      "code": "147258",
      "timestamp": 1730303300000,
      "expiresAt": 1730303600000
    }
  ]
}
```

این API:
- فقط در local/demo کار می‌کنه
- در production 404 برمیگردونه
- لیست از جدید به قدیم است
- کدهای بیشتر از 30 دقیقه خودکار پاک میشن

---

## تاکید: هیچ Fetch ای نیست! 

```typescript
// در local/demo این کد اجرا میشه:
private async sendSandboxOTP(phone: string, code: string) {
  // فقط در memory ذخیره میکنیم
  sandboxMessages.set(phone, { phone, code, ... })
  
  // فقط console.log
  console.log('📱 [LOCAL SMS - NO FETCH] OTP Code:', ...)
  
  // فقط return
  return { success: true, code }
  
  // هیچ fetch ای نیست! ❌
}
```

---

## تست کامل

```bash
# Terminal 1: اجرای backend
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
yarn dev

# Terminal 2: تست
# 1. ارسال OTP
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# 2. دیدن لیست کدها
curl http://localhost:9000/store/auth/sandbox-messages

# 3. استفاده از کد برای verify
curl -X POST http://localhost:9000/store/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789", "code": "384726"}'
```

---

## چرا این روش خوبه؟

✅ **هیچ درخواست خارجی** - سریع و بدون نیاز به اینترنت  
✅ **بدون نیاز به کلید SMS.ir** - فقط `APP_ENV=local` کافیه  
✅ **تست راحت** - همه کدها در یک جا  
✅ **بدون rate limit مشکل‌ساز** - اگه خطا بده، rate limit اعمال نمیشه  
✅ **Production امن** - در production اصلاً این API کار نمی‌کنه

---

**الان واضحه؟ هیچ fetch ای نیست! 🚫**




