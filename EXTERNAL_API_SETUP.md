# راهنمای نصب و راه‌اندازی External API

## خلاصه تغییرات انجام شده

### 1. Module جدید: API Client (`@mercurjs/api-client`)

یک module کامل برای مدیریت کلاینت‌های خارجی ایجاد شد:

**موقعیت:** `/packages/modules/api-client/`

**شامل:**
- ✅ Model: `ApiClient` - برای ذخیره اطلاعات کلاینت‌ها
- ✅ Model: `ClientSellerLink` - برای مدیریت دسترسی کلاینت‌ها به sellers
- ✅ Service با متدهای کامل برای مدیریت و احراز هویت
- ✅ Hashing امن برای secrets

### 2. Middlewares امنیتی

**موقعیت:** `/apps/backend/src/shared/infra/http/middlewares/`

- `authenticateApiClient()` - احراز هویت با API Key/Secret
- `checkSellerAccess()` - بررسی دسترسی به seller خاص
- `filterByAccessibleSellers()` - فیلتر کردن نتایج بر اساس دسترسی
- `checkProductSellerAccess()` - بررسی دسترسی به product
- `checkVariantSellerAccess()` - بررسی دسترسی به variant
- `checkInventorySellerAccess()` - بررسی دسترسی به inventory

### 3. External API Endpoints

**موقعیت:** `/apps/backend/src/api/external/`

#### Sellers API
- `GET /external/sellers` - لیست sellers
- `POST /external/sellers` - ایجاد seller
- `GET /external/sellers/{id}` - دریافت seller
- `PUT /external/sellers/{id}` - بروزرسانی seller
- `DELETE /external/sellers/{id}` - حذف seller

#### Products API
- `GET /external/products` - لیست products
- `POST /external/products` - ایجاد product
- `GET /external/products/{id}` - دریافت product
- `PUT /external/products/{id}` - بروزرسانی product
- `DELETE /external/products/{id}` - حذف product

#### Variants API
- `GET /external/variants` - لیست variants
- `POST /external/variants` - ایجاد variant
- `GET /external/variants/{id}` - دریافت variant
- `PUT /external/variants/{id}` - بروزرسانی variant
- `DELETE /external/variants/{id}` - حذف variant

#### Inventory API
- `GET /external/inventory` - لیست inventory levels
- `GET /external/inventory/{id}` - دریافت inventory item
- `PUT /external/inventory/{id}` - بروزرسانی موجودی (set)
- `POST /external/inventory/{id}/adjust` - تنظیم موجودی (adjust)

### 4. Admin API برای مدیریت

**موقعیت:** `/apps/backend/src/api/admin/api-clients/`

- `GET /admin/api-clients` - لیست کلاینت‌ها
- `POST /admin/api-clients` - ایجاد کلاینت
- `GET /admin/api-clients/{id}` - دریافت کلاینت
- `PUT /admin/api-clients/{id}` - بروزرسانی کلاینت
- `DELETE /admin/api-clients/{id}` - حذف کلاینت
- `GET /admin/api-clients/{id}/sellers` - لیست sellers کلاینت
- `POST /admin/api-clients/{id}/sellers` - اعطای دسترسی
- `DELETE /admin/api-clients/{id}/sellers/{seller_id}` - لغو دسترسی

### 5. Swagger Documentation

**موقعیت:** `/apps/backend/src/api/openapi/external/`

- Schema های کامل برای تمام entities
- Documentation برای تمام endpoints
- Security scheme برای API Key authentication

### 6. مستندات

- `README.md` - مستندات فنی module
- `EXTERNAL_API_GUIDE.md` - راهنمای استفاده برای توسعه‌دهندگان
- این فایل - راهنمای نصب

## مراحل نصب و راه‌اندازی

### مرحله 1: نصب Dependencies

```bash
cd /home/mehdi/all/repositories/github.com/mercur
yarn install
```

### مرحله 2: Build کردن Module

```bash
# Build کردن framework (اگر لازم است)
cd packages/framework
yarn build

# Build کردن api-client module
cd ../modules/api-client
yarn build
```

### مرحله 3: اجرای Migrations

Module به صورت خودکار migrations رو ایجاد می‌کنه وقتی Medusa اجرا بشه:

```bash
cd apps/backend
npx medusa db:migrate
```

این دو جدول رو ایجاد می‌کنه:
- `api_client` - اطلاعات کلاینت‌ها
- `client_seller_link` - ارتباط کلاینت-seller

### مرحله 4: راه‌اندازی Backend

```bash
cd apps/backend
yarn dev
```

### مرحله 5: تست کردن

#### 5.1. ایجاد API Client

از Admin API:

```bash
curl -X POST "http://localhost:9000/admin/api-clients" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "description": "Client for testing"
  }'
```

نتیجه:
```json
{
  "api_client": {
    "id": "apic_xxxxx",
    "name": "Test Client",
    "api_key": "ak_xxxxxxxxxx",
    "is_active": true
  },
  "credentials": {
    "api_key": "ak_xxxxxxxxxx",
    "api_secret": "xxxxxxxxxx"
  }
}
```

**⚠️ مهم:** `api_secret` را ذخیره کنید!

#### 5.2. اعطای دسترسی به Seller

```bash
curl -X POST "http://localhost:9000/admin/api-clients/apic_xxxxx/sellers" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "sel_xxxxx"
  }'
```

#### 5.3. تست External API

```bash
curl -X GET "http://localhost:9000/external/sellers" \
  -H "X-API-Key: ak_xxxxxxxxxx" \
  -H "X-API-Secret: xxxxxxxxxx"
```

### مرحله 6: مشاهده Swagger Documentation

بعد از راه‌اندازی backend:

```
http://localhost:9000/docs
```

تمام External API endpoints در تگ "External API" قابل مشاهده هستند.

## تنظیمات محیط

اگر نیاز به CORS برای External API دارید، به `medusa-config.ts` اضافه کنید:

```typescript
export default defineConfig({
  projectConfig: {
    http: {
      // ... existing configs
      // @ts-expect-error: externalCors is custom
      externalCors: process.env.EXTERNAL_CORS || "*"
    }
  }
})
```

و در `.env`:

```env
EXTERNAL_CORS=https://external-client.com
```

## استفاده در Production

### امنیت

1. **HTTPS اجباری:** تمام درخواست‌ها باید از HTTPS استفاده کنند
2. **Rate Limiting:** برای هر کلاینت rate limit مناسب تعیین کنید
3. **Monitoring:** لاگ تمام درخواست‌های External API
4. **Secret Rotation:** به صورت دوره‌ای secrets را تغییر دهید

### Performance

1. از caching برای endpoints پرتردد استفاده کنید
2. پیاده‌سازی pagination برای لیست‌های بزرگ
3. استفاده از database indexes برای queries

### Monitoring

لاگ کردن تمام فعالیت‌های External API:

```javascript
// در middleware
logger.info({
  type: 'external_api_request',
  client_id: req.apiClient.id,
  endpoint: req.path,
  method: req.method,
  timestamp: new Date()
});
```

## Troubleshooting

### مشکل: Module پیدا نمی‌شه

```bash
# مطمئن شوید module در medusa-config اضافه شده
# و dependencies نصب شدن
cd /home/mehdi/all/repositories/github.com/mercur
yarn install
cd apps/backend
yarn install
```

### مشکل: خطای Migration

```bash
# پاک کردن cache و اجرای مجدد
cd apps/backend
rm -rf .medusa
npx medusa db:migrate
```

### مشکل: خطای Authentication

- بررسی کنید headers درست فرستاده می‌شن
- مطمئن شوید کلاینت `is_active: true` باشه
- بررسی کنید secret صحیح باشه

### مشکل: خطای 403 Forbidden

- بررسی کنید کلاینت به seller دسترسی داره
- از Admin API لیست sellers کلاینت رو چک کنید

## Next Steps

1. پیاده‌سازی Webhook برای اطلاع‌رسانی تغییرات
2. اضافه کردن Bulk Operations
3. پیاده‌سازی Image Upload
4. اضافه کردن Analytics و Reporting

## پشتیبانی

برای سوالات و مشکلات:
- مستندات: `/docs` endpoint
- README: `/packages/modules/api-client/README.md`
- راهنمای استفاده: `/EXTERNAL_API_GUIDE.md`

