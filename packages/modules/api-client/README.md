# API Client Module

این module برای مدیریت کلاینت‌های خارجی (External API Clients) طراحی شده که به آن‌ها اجازه می‌دهد از طریق REST API به اطلاعات Sellers، Products، Variants و Inventory دسترسی داشته باشند.

## ویژگی‌ها

- ✅ احراز هویت مبتنی بر API Key و Secret
- ✅ مدیریت دسترسی به Sellers (هر کلاینت فقط به sellers مجاز خود دسترسی دارد)
- ✅ مستندات کامل Swagger/OpenAPI
- ✅ Rate limiting (اختیاری)
- ✅ Admin API برای مدیریت کلاینت‌ها

## نصب و راه‌اندازی

### 1. اضافه کردن Module به Medusa Config

```typescript
// medusa-config.ts
export default defineConfig({
  modules: [
    { resolve: '@mercurjs/api-client' },
    // ... other modules
  ]
})
```

### 2. اجرای Migrations

```bash
npx medusa db:migrate
```

## استفاده

### ساخت API Client (از طریق Admin API)

```bash
POST /admin/api-clients
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "name": "External Client Name",
  "description": "Client description",
  "rate_limit": 100
}
```

پاسخ شامل `api_key` و `api_secret` است که باید یکبار ذخیره شوند (دوباره نمایش داده نمی‌شوند).

### اعطای دسترسی به Seller

```bash
POST /admin/api-clients/{client_id}/sellers
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "seller_id": "sel_123456"
}
```

### استفاده از External API

تمام درخواست‌های External API نیاز به دو header دارند:

```
X-API-Key: ak_xxxxxxxxxxxxx
X-API-Secret: xxxxxxxxxxxxxxxx
```

## External API Endpoints

### Sellers

```bash
# لیست sellers
GET /external/sellers

# ایجاد seller جدید
POST /external/sellers
{
  "name": "Store Name",
  "handle": "store-handle",
  "email": "contact@store.com",
  ...
}

# دریافت یک seller
GET /external/sellers/{id}

# بروزرسانی seller
PUT /external/sellers/{id}

# حذف seller
DELETE /external/sellers/{id}
```

### Products

```bash
# لیست products
GET /external/products?seller_id=sel_123

# ایجاد product
POST /external/products
{
  "title": "Product Title",
  "seller_id": "sel_123",
  "description": "Product description",
  "variants": [
    {
      "title": "Variant 1",
      "sku": "SKU-001",
      "prices": [
        {
          "amount": 1000,
          "currency_code": "usd"
        }
      ]
    }
  ],
  "images": [
    {
      "url": "https://example.com/image.jpg"
    }
  ]
}

# دریافت product
GET /external/products/{id}

# بروزرسانی product
PUT /external/products/{id}

# حذف product
DELETE /external/products/{id}
```

### Variants

```bash
# لیست variants
GET /external/variants?product_id=prod_123

# ایجاد variant
POST /external/variants
{
  "title": "Size L / Red",
  "product_id": "prod_123",
  "sku": "SKU-002",
  "prices": [
    {
      "amount": 1500,
      "currency_code": "usd"
    }
  ]
}

# دریافت variant
GET /external/variants/{id}

# بروزرسانی variant
PUT /external/variants/{id}

# حذف variant
DELETE /external/variants/{id}
```

### Inventory

```bash
# لیست inventory levels
GET /external/inventory?variant_id=var_123

# دریافت inventory item
GET /external/inventory/{id}

# بروزرسانی موجودی (set)
PUT /external/inventory/{id}
{
  "location_id": "loc_123",
  "stocked_quantity": 100
}

# تنظیم موجودی (adjust)
POST /external/inventory/{id}/adjust
{
  "location_id": "loc_123",
  "adjustment": 10  // منفی برای کم کردن
}
```

## Admin API Endpoints

### مدیریت API Clients

```bash
# لیست کلاینت‌ها
GET /admin/api-clients

# ایجاد کلاینت
POST /admin/api-clients

# دریافت کلاینت
GET /admin/api-clients/{id}

# بروزرسانی کلاینت
PUT /admin/api-clients/{id}

# حذف کلاینت
DELETE /admin/api-clients/{id}

# دریافت لیست sellers یک کلاینت
GET /admin/api-clients/{id}/sellers

# اعطای دسترسی به seller
POST /admin/api-clients/{id}/sellers

# لغو دسترسی به seller
DELETE /admin/api-clients/{id}/sellers/{seller_id}
```

## امنیت

### احراز هویت

- تمام درخواست‌ها نیاز به `X-API-Key` و `X-API-Secret` headers دارند
- Secret به صورت hashed (SHA-256) در دیتابیس ذخیره می‌شود
- Secret فقط یک بار هنگام ساخت کلاینت نمایش داده می‌شود

### مجوزدهی

- هر کلاینت فقط به sellers مجاز خود دسترسی دارد
- تمام endpoints برای چک کردن دسترسی middleware دارند
- نمی‌توان به products/variants/inventory که متعلق به sellers غیرمجاز هستند دسترسی داشت

### Rate Limiting

می‌توانید برای هر کلاینت `rate_limit` تعیین کنید (تعداد درخواست در دقیقه).

## Swagger Documentation

برای مشاهده مستندات کامل Swagger:

```
GET /docs
```

تمام External API endpoints در تگ "External API" قرار دارند.

## مثال استفاده با cURL

### دریافت لیست Sellers

```bash
curl -X GET "https://api.example.com/external/sellers" \
  -H "X-API-Key: ak_xxxxxxxxxxxxx" \
  -H "X-API-Secret: xxxxxxxxxxxxxxxx"
```

### ایجاد Product

```bash
curl -X POST "https://api.example.com/external/products" \
  -H "X-API-Key: ak_xxxxxxxxxxxxx" \
  -H "X-API-Secret: xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Product",
    "seller_id": "sel_123",
    "variants": [
      {
        "title": "Default Variant",
        "sku": "PROD-001",
        "prices": [{"amount": 2000, "currency_code": "usd"}]
      }
    ]
  }'
```

### بروزرسانی موجودی

```bash
curl -X PUT "https://api.example.com/external/inventory/inv_123" \
  -H "X-API-Key: ak_xxxxxxxxxxxxx" \
  -H "X-API-Secret: xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "loc_123",
    "stocked_quantity": 50
  }'
```

## توسعه و Testing

### ساختن Module

```bash
cd packages/modules/api-client
npm run build
```

### تست کردن

1. ساخت API Client از طریق Admin Panel
2. اعطای دسترسی به یک Seller
3. استفاده از credentials برای دسترسی به External APIs

## Troubleshooting

### خطای 401 Unauthorized

- مطمئن شوید `X-API-Key` و `X-API-Secret` صحیح هستند
- بررسی کنید که کلاینت فعال باشد (`is_active: true`)

### خطای 403 Forbidden

- بررسی کنید که کلاینت به seller مربوطه دسترسی دارد
- از Admin API استفاده کنید تا دسترسی‌ها را بررسی کنید

### خطای 404 Not Found

- مطمئن شوید IDs صحیح هستند
- بررسی کنید که منبع مورد نظر برای seller مجاز شما باشد

