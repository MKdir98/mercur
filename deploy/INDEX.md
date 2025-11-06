# 📑 فهرست فایل‌های Deploy Directory

## 🎯 فایل‌هایی که باید بخونی (به ترتیب اولویت)

### 1️⃣ شروع سریع
📄 **`QUICK-START.md`** - اینجا شروع کن! (3 دقیقه)
- چطور از اسکریپت قبلی migrate کنم؟
- 3 مرحله ساده برای شروع
- Checklist نهایی

### 2️⃣ راهنمای کامل
📄 **`README.md`** - راهنمای جامع
- توضیح کامل همه commands
- Troubleshooting
- Security notes

### 3️⃣ مقایسه
📄 **`COMPARISON.md`** - تفاوت دو اسکریپت
- چرا migrate کنم?
- چه مزایایی داره؟
- جدول مقایسه کامل

### 4️⃣ راهنمای نصب سرویس‌ها
📄 **`SERVICES-CHECK.md`** - نصب Redis & Elasticsearch
- چرا نیاز هستند؟
- راهنمای نصب گام به گام
- Troubleshooting

---

## 🔧 فایل‌های اسکریپت

### اسکریپت اصلی
📜 **`deploy.sh`** - اسکریپت دیپلوی اصلی (جدید، پیشنهادی) ✅
- Configuration-based
- Multi-environment support
- Clean & maintainable

### اسکریپت‌های کمکی نصب
📜 **`install-services.sh`** - نصب همه سرویس‌ها (Redis + Elasticsearch) 🆕
📜 **`install-redis.sh`** - نصب فقط Redis 🆕
📜 **`install-elasticsearch.sh`** - نصب فقط Elasticsearch 🆕

### اسکریپت قدیمی
📜 **`marketplace-deploy.sh`** - اسکریپت legacy (قدیمی)
- Hard-coded configs
- Single environment
- نگه داشته شده برای backward compatibility

---

## ⚙️ فایل‌های Configuration

### آماده برای استفاده
📋 **`production.properties`** - تنظیمات production
- همه environment variables
- باید API keys رو پر کنی

📋 **`demo.properties`** - تنظیمات demo/test
- پورت‌ها و دامنه‌های متفاوت
- برای محیط تست

### Template
📋 **`template.properties`** - الگو برای config جدید
- کپی کن و شروع کن
- همه options با توضیح

---

## 🔒 امنیت

📄 **`.gitignore`** - جلوگیری از commit شدن secrets
- فایل‌های `.properties` ignore می‌شن
- فقط `template.properties` commit می‌شه

---

## 📚 فایل‌های راهنمای اضافی (اختیاری)

این فایل‌ها از قبل در پوشه بودند، می‌تونی نگاهشون کنی:

📄 **`CONFIG-EXAMPLES-README.md`**
📄 **`DEPLOYMENT.md`**
📄 **`ENV-VARIABLES-GUIDE.md`**
📄 **`FILES-SUMMARY.md`**
📄 **`MODULAR-DEPLOY-README.md`**
📄 **`README-DEPLOYMENT.md`**
📄 **`SSL-SAFE-DEPLOYMENT.md`**

---

## 🗺️ مسیر پیشنهادی برای شروع

```
1. QUICK-START.md          ← شروع از اینجا (5 دقیقه)
   ↓
2. ویرایش production.properties
   ↓
3. اجرای: sudo bash deploy.sh production.properties deploy
   ↓
4. در صورت نیاز: README.md (اطلاعات بیشتر)
   ↓
5. در صورت نیاز: COMPARISON.md (فهم عمیق‌تر)
```

---

## 🎯 من چی نیاز دارم؟

### من تازه شروع کردم
➡️ `QUICK-START.md` + `template.properties`

### من از marketplace-deploy.sh استفاده می‌کنم
➡️ `COMPARISON.md` + `QUICK-START.md` + `production.properties`

### می‌خوام همه جزئیات رو بدونم
➡️ `README.md` (راهنمای کامل)

### می‌خوام demo و production همزمان داشته باشم
➡️ `production.properties` + `demo.properties`

### نمی‌دونم چیکار کنم!
➡️ `QUICK-START.md` همین!

---

## 📋 Checklist ساده

برای migration یا شروع جدید:

- [ ] خوندم `QUICK-START.md`
- [ ] کپی کردم `template.properties` یا ویرایش کردم `production.properties`
- [ ] پر کردم همه API keys
- [ ] (اگر migrate) Stop کردم PM2 processes قدیمی
- [ ] (اگر migrate) حذف کردم Nginx config قدیمی
- [ ] اجرا کردم `sudo bash deploy.sh production.properties deploy`
- [ ] تست کردم سایت

---

## 🆘 کمک می‌خوام!

1. ابتدا `QUICK-START.md` رو بخون
2. اگر حل نشد، `README.md` سکشن Troubleshooting
3. اگر باز مشکل داری، لاگ‌ها رو چک کن: `pm2 logs`
4. هنوز مشکل داری؟ Issue باز کن در GitHub

---

## 🎉 خلاصه

**برای شروع سریع:**
1. `QUICK-START.md`
2. `production.properties` (ویرایش)
3. `sudo bash deploy.sh production.properties deploy`

**Done!** 🚀

