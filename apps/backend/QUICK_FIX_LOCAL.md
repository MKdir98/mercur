# حل سریع مشکل SMS در Local

## 🔴 مشکلات فعلی:
1. خطا: "کلید وب سرویس نامعتبر است" (هنوز به SMS.ir واقعی درخواست میده)
2. Rate limiting خیلی تنده (114 ثانیه!)

## ✅ حل فوری (5 دقیقه)

### قدم 1: پاک کردن و ساخت .env جدید

```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend

# اجرای اسکریپت reset
bash reset-and-test-sms.sh
```

این اسکریپت:
- ✅ `.env` قدیمی رو backup می‌گیره
- ✅ `.env` جدید با `APP_ENV=local` می‌سازه
- ✅ تنظیمات صحیح رو اعمال می‌کنه

---

### قدم 2: اجرای Backend

```bash
# در همین terminal:
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend

# نصب dependencies (اگه لازم باشه)
yarn install

# اجرای backend
yarn dev
```

**باید ببینی:**
```
🚀 Server ready at: http://localhost:9000
```

**نگه‌دار این terminal باز!** (اینجا کدهای OTP نمایش داده می‌شن)

---

### قدم 3: تست (در terminal دیگه)

```bash
# باز کن terminal جدید
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend

# اجرای اسکریپت تست
bash test-sms-local.sh
```

**اگه موفق باشه، می‌بینی:**
```
✅ Backend در حال اجرا
✅ SMS در حالت Sandbox هست
📱 کد OTP: 384726
✅ Verify کردن کار می‌کنه
🎉 همه تست‌ها موفق بود!
```

---

### قدم 4: تست از Browser

حالا برو به frontend:

```
http://localhost:3001/register
```

1. شماره بزن: `09123456789`
2. کلیک "ارسال کد"
3. **به terminal backend نگاه کن** 👀

باید ببینی:
```bash
📱 [SANDBOX SMS] OTP Code: {
  phone: '09123456789',
  code: '384726',
  expiresAt: '...'
}
```

4. کد `384726` رو در browser وارد کن
5. Done! ✅

---

## 🔧 اگه باز هم مشکل داری

### مشکل: هنوز خطای "کلید نامعتبر"

**چک کن:**
```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
cat .env | grep APP_ENV
```

باید ببینی: `APP_ENV=local`

**اگه نبود:**
```bash
nano .env
```

خط اول رو اضافه کن:
```
APP_ENV=local
```

ذخیره کن (Ctrl+O، Enter، Ctrl+X)

**Restart backend:**
```bash
# در terminal که backend اجراست: Ctrl+C
yarn dev
```

---

### مشکل: Rate limiting خیلی تنده

**حل موقت - پاک کردن OTP:**

```bash
curl -X POST http://localhost:9000/store/auth/clear-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

این کد rate limit رو reset می‌کنه و می‌تونی دوباره درخواست بدی!

**حل دائمی:**

با تغییراتی که دادم، حالا:
- **Local:** فقط 30 ثانیه صبر کن (قبلاً 2 دقیقه بود!)
- **Production:** 2 دقیقه

---

## 📺 مثال کامل - گام به گام

### Terminal 1 - Backend
```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
bash reset-and-test-sms.sh
yarn dev

# خروجی:
🚀 Server ready at: http://localhost:9000
```

### Terminal 2 - تست
```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
bash test-sms-local.sh

# خروجی:
✅ Backend در حال اجرا
📱 کد OTP: 384726
🎉 همه تست‌ها موفق بود!
```

### Terminal 3 - Frontend (اختیاری)
```bash
cd /home/mehdi/all/repositories/github.com/b2c-marketplace-storefront
npm run dev

# باز کن: http://localhost:3001/register
```

---

## 🎯 نکات مهم

### در محیط Local:

✅ **SMS واقعی ارسال نمی‌شه**  
✅ **کد در terminal نمایش داده می‌شه**  
✅ **کد در response API هم هست** (فیلد `code`)  
✅ **Rate limiting کمتره** (30 ثانیه)  
✅ **نیاز به کلید واقعی SMS.ir نیست**

### دستورات مفید:

```bash
# چک کردن APP_ENV
cat .env | grep APP_ENV

# چک کردن backend اجراست
curl http://localhost:9000/health

# پاک کردن rate limit
curl -X POST http://localhost:9000/store/auth/clear-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "PHONE_NUMBER"}'

# تست ارسال OTP
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'

# مشاهده logs
cd apps/backend && yarn dev
```

---

## ✅ Checklist

قبل از تست:

- [ ] Backend اجرا هست (`yarn dev`)
- [ ] `.env` دارد `APP_ENV=local`
- [ ] تست اسکریپت موفق بود (`bash test-sms-local.sh`)
- [ ] در terminal کد OTP نمایش داده می‌شه

اگه همه ✅ باشن، باید کار کنه!

---

## 🆘 همچنان مشکل داری؟

اجرا کن:

```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend

# debug کامل
echo "=== Checking APP_ENV ==="
cat .env | grep APP_ENV

echo ""
echo "=== Checking Backend ==="
curl -s http://localhost:9000/health && echo "✅ Running" || echo "❌ Not running"

echo ""
echo "=== Testing SMS ==="
curl -X POST http://localhost:9000/store/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "09123456789"}'
```

خروجی رو بهم نشون بده تا ببینیم کجا مشکل هست!

---

**موفق باشی! 🎉**





