# Postex Integration Setup

این راهنما نحوه پیکربندی Postex برای محاسبه داینامیک قیمت ارسال را توضیح می‌دهد.

## متغیرهای محیطی (Environment Variables)

برای فعال‌سازی Postex، متغیرهای زیر را در فایل `.env` خود تنظیم کنید:

### الزامی
```bash
# Postex API Base URL
POSTEX_BASE_URL=https://api.postex.ir

# Postex API Key (دریافت از پنل Postex)
POSTEX_API_KEY=your_api_key_here
```

### اختیاری (مقادیر پیش‌فرض)
```bash
# ابعاد پیش‌فرض بسته‌ها (زمانی که ابعاد محصول موجود نباشد)

# وزن به کیلوگرم
POSTEX_DEFAULT_WEIGHT_KG=0.5

# ابعاد به سانتی‌متر
POSTEX_DEFAULT_LENGTH_CM=20
POSTEX_DEFAULT_WIDTH_CM=15
POSTEX_DEFAULT_HEIGHT_CM=10
```

## نحوه عملکرد

### 1. محاسبه قیمت داینامیک
زمانی که کاربر در checkout شهر و استان خود را وارد می‌کند:

1. سیستم شهر و استان **مشتری** را از cart shipping address می‌گیرد
2. شهر و استان **فروشنده** را از stock location address می‌گیرد
3. **بهینه‌سازی**: اگر `city_id` و `state_id` در address موجود باشند:
   - مستقیماً از database Postex codes را می‌گیرد (سریع‌تر)
   - در غیر این صورت، نام‌های فارسی را جستجو می‌کند (کندتر)
4. این نام‌های فارسی یا ID ها را به **Postex city/province codes** تبدیل می‌کند
5. با استفاده از این کدها، API Postex را فراخوانی می‌کند
6. قیمت واقعی ارسال را نمایش می‌دهد

**توصیه**: همیشه `city_id` و `state_id` را در address ذخیره کنید برای performance بهتر.

### 2. Fallback Strategy
در صورت بروز مشکل، سیستم به قیمت‌های پیش‌فرض برمی‌گردد:
- **Pickup**: 75,000 تومان
- **Delivery**: 150,000 تومان

مشکلاتی که باعث استفاده از fallback می‌شوند:
- عدم وجود API key
- عدم mapping شهر/استان در database
- خطای API
- عدم وجود address کامل

## پیش‌نیازها

### 1. Stock Location Address
هر فروشنده باید در vendor panel یک stock location با آدرس کامل ایجاد کند:
- **City** (شهر به فارسی)
- **City ID** (شناسه شهر - **توصیه می‌شود**)
- **Province** (استان به فارسی)
- **State ID** (شناسه استان - **توصیه می‌شود**)
- آدرس کامل، کد پستی و سایر جزئیات

**نکته مهم**: استفاده از `city_id` و `state_id` بهینه‌تر و سریعتر از استفاده از نام‌های text است.

### 2. City/Province Mapping
جداول `city` و `state` باید دارای Postex codes باشند:
- `state.postex_province_code`
- `city.postex_city_code`

این mapping باید از قبل در database populate شده باشد.

### 3. Database Schema
پس از اجرای migrations، جدول `address` شامل فیلدهای زیر است:
- `city` (TEXT) - نام شهر
- `city_id` (TEXT) - شناسه شهر (FK به جدول city)
- `province` (TEXT) - نام استان
- `state_id` (TEXT) - شناسه استان (FK به جدول state)

### 3. Cart Shipping Address
مشتری باید در checkout شهر و استان خود را انتخاب کند:
- **City** (شهر)
- **Province** (استان)

## تست

### بدون API Key (Local Development)
اگر `POSTEX_API_KEY` ست نشده باشد، سیستم:
1. Warning در console نمایش می‌دهد
2. از fallback prices استفاده می‌کند
3. همچنان کار می‌کند (بدون خطا)

### با API Key
برای تست کامل:
1. API key معتبر Postex را در `.env` قرار دهید
2. مطمئن شوید stock location دارای city/province است
3. در checkout، شهر و استان را انتخاب کنید
4. لاگ‌ها را در console بررسی کنید:
   ```
   🚀 [POSTEX] Starting calculatePrice
   🔹 [POSTEX] Cart ID: cart_xxx
   ✅ [POSTEX] Cart found: cart_xxx
   🔹 [POSTEX] Shipping address: { city: 'تهران', province: 'تهران' }
   ✅ [POSTEX] Location address found: { city: 'تهران', city_id: 'city_xxx', province: 'تهران', state_id: 'state_xxx' }
   🔹 [POSTEX] Using city_id for origin: city_xxx  // اگر city_id موجود باشد
   🔹 [POSTEX] Destination codes: { city_code: 'xxx', province_code: 'xxx' }
   🔹 [POSTEX] Origin codes: { city_code: 'xxx', province_code: 'xxx' }
   🟢 [POSTEX] Calculating rates: ...
   ✅ [POSTEX] API returned price: 125000
   ```

## عیب‌یابی (Troubleshooting)

### خطا: "Shipping options do not have a price"
این خطا از backend می‌آید و می‌تواند دلایل زیر را داشته باشد:

1. **Stock location فاقد city/province است**
   - راه حل: در vendor panel، location را ویرایش کنید و city/province را اضافه کنید

2. **Cart فاقد shipping address است**
   - راه حل: مطمئن شوید کاربر در checkout شهر و استان را انتخاب کرده

3. **City/Province mapping موجود نیست**
   - راه حل: Postex codes را در جداول database populate کنید

4. **Shipping option به درستی configure نشده**
   - راه حل: مطمئن شوید shipping option از نوع Postex است و به stock location مرتبط است

### لاگ‌های مفید
همه لاگ‌های Postex با prefix `[POSTEX]` شروع می‌شوند:
- `🚀` شروع process
- `✅` موفق
- `⚠️` هشدار (استفاده از fallback)
- `❌` خطا

## فایل‌های مرتبط

- `/apps/backend/src/modules/postex/service.ts` - سرویس اصلی Postex
- `/apps/backend/src/integrations/postex/client.ts` - کلاینت API
- `/apps/backend/src/integrations/postex/types.ts` - تعریف types
- `/packages/modules/city/src/service.ts` - سرویس city mapping

## API Reference

برای اطلاعات بیشتر درباره Postex API:
- Documentation: https://staging.api.postex.ir/developers-docs/
- Design Doc: `/docs/postex-integration.md` (در storefront)

