# راهنمای استفاده از External API

این مستند راهنمای کامل استفاده از External API برای کلاینت‌های خارجی است.

## نمای کلی

External API به کلاینت‌های خارجی اجازه می‌دهد تا:
- اطلاعات Sellers خود را مدیریت کنند
- Products، Variants و Inventory را ایجاد و مدیریت کنند
- به صورت خودکار داده‌ها را sync کنند

## شروع سریع

### 1. دریافت Credentials

برای شروع، نیاز دارید که مدیر سیستم برای شما یک API Client ایجاد کند:

```bash
POST /admin/api-clients
{
  "name": "My Integration",
  "description": "Integration for XYZ system"
}
```

پاسخ شامل این موارد خواهد بود:

```json
{
  "api_client": {
    "id": "apic_123",
    "name": "My Integration",
    "api_key": "ak_48charsrandomstring...",
    "is_active": true
  },
  "credentials": {
    "api_key": "ak_48charsrandomstring...",
    "api_secret": "64charsrandomstring..."
  }
}
```

**⚠️ مهم:** `api_secret` را در جای امنی ذخیره کنید. این فقط یک بار نمایش داده می‌شود!

### 2. دریافت دسترسی به Seller

مدیر سیستم باید به شما دسترسی به seller(s) بدهد:

```bash
POST /admin/api-clients/apic_123/sellers
{
  "seller_id": "sel_456"
}
```

### 3. تست اتصال

```bash
curl -X GET "https://api.example.com/external/sellers" \
  -H "X-API-Key: ak_48charsrandomstring..." \
  -H "X-API-Secret: 64charsrandomstring..."
```

## احراز هویت

تمام درخواست‌ها باید شامل دو header زیر باشند:

```
X-API-Key: YOUR_API_KEY
X-API-Secret: YOUR_API_SECRET
```

### مثال با مختلف زبان‌های برنامه‌نویسی

#### JavaScript / Node.js

```javascript
const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'X-API-Key': 'ak_48charsrandomstring...',
    'X-API-Secret': '64charsrandomstring...',
    'Content-Type': 'application/json'
  }
});

// دریافت لیست sellers
const sellers = await apiClient.get('/external/sellers');

// ایجاد product
const product = await apiClient.post('/external/products', {
  title: 'New Product',
  seller_id: 'sel_456',
  variants: [/* ... */]
});
```

#### Python

```python
import requests

class ExternalAPIClient:
    def __init__(self, api_key, api_secret, base_url):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'X-API-Secret': api_secret,
            'Content-Type': 'application/json'
        }
    
    def get_sellers(self):
        response = requests.get(
            f'{self.base_url}/external/sellers',
            headers=self.headers
        )
        return response.json()
    
    def create_product(self, data):
        response = requests.post(
            f'{self.base_url}/external/products',
            headers=self.headers,
            json=data
        )
        return response.json()

# استفاده
client = ExternalAPIClient(
    api_key='ak_48charsrandomstring...',
    api_secret='64charsrandomstring...',
    base_url='https://api.example.com'
)

sellers = client.get_sellers()
```

#### PHP

```php
<?php

class ExternalAPIClient {
    private $apiKey;
    private $apiSecret;
    private $baseUrl;
    
    public function __construct($apiKey, $apiSecret, $baseUrl) {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->baseUrl = $baseUrl;
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $ch = curl_init($this->baseUrl . $endpoint);
        
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'X-API-Key: ' . $this->apiKey,
                'X-API-Secret: ' . $this->apiSecret,
                'Content-Type: application/json'
            ]
        ]);
        
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function getSellers() {
        return $this->makeRequest('GET', '/external/sellers');
    }
    
    public function createProduct($data) {
        return $this->makeRequest('POST', '/external/products', $data);
    }
}

// استفاده
$client = new ExternalAPIClient(
    'ak_48charsrandomstring...',
    '64charsrandomstring...',
    'https://api.example.com'
);

$sellers = $client->getSellers();
```

## سناریوهای رایج

### سناریو 1: Sync کردن Products از سیستم خارجی

```javascript
// 1. دریافت لیست products از سیستم خود
const myProducts = await getProductsFromMySystem();

// 2. برای هر product، ایجاد یا بروزرسانی در marketplace
for (const product of myProducts) {
  try {
    // بررسی اینکه آیا product وجود دارد (با SKU)
    const existing = await apiClient.get(`/external/products`, {
      params: { sku: product.sku }
    });
    
    if (existing.data.products.length > 0) {
      // بروزرسانی
      await apiClient.put(
        `/external/products/${existing.data.products[0].id}`,
        mapProductData(product)
      );
    } else {
      // ایجاد
      await apiClient.post(
        '/external/products',
        mapProductData(product)
      );
    }
  } catch (error) {
    console.error(`Error syncing product ${product.sku}:`, error);
  }
}
```

### سناریو 2: بروزرسانی موجودی به صورت Batch

```javascript
async function updateInventoryBatch(updates) {
  const results = [];
  
  for (const update of updates) {
    try {
      const result = await apiClient.put(
        `/external/inventory/${update.inventory_item_id}`,
        {
          location_id: update.location_id,
          stocked_quantity: update.quantity
        }
      );
      results.push({ success: true, ...result.data });
    } catch (error) {
      results.push({ 
        success: false, 
        inventory_item_id: update.inventory_item_id,
        error: error.message 
      });
    }
  }
  
  return results;
}

// استفاده
const updates = [
  { inventory_item_id: 'inv_1', location_id: 'loc_1', quantity: 100 },
  { inventory_item_id: 'inv_2', location_id: 'loc_1', quantity: 50 },
  // ...
];

const results = await updateInventoryBatch(updates);
console.log(`Updated ${results.filter(r => r.success).length} items`);
```

### سناریو 3: ایجاد Product کامل با Variants و Images

```javascript
async function createCompleteProduct(productData) {
  // 1. آپلود تصاویر (اگر نیاز است)
  const imageUrls = await uploadImages(productData.images);
  
  // 2. ایجاد product با variants
  const product = await apiClient.post('/external/products', {
    title: productData.title,
    description: productData.description,
    seller_id: 'sel_456',
    handle: generateHandle(productData.title),
    
    // Options (مثل Size, Color)
    options: [
      { title: 'Size', values: ['S', 'M', 'L', 'XL'] },
      { title: 'Color', values: ['Red', 'Blue', 'Green'] }
    ],
    
    // Images
    images: imageUrls.map(url => ({ url })),
    
    // Variants
    variants: productData.variants.map(v => ({
      title: v.title,
      sku: v.sku,
      options: v.options, // e.g., { "Size": "L", "Color": "Red" }
      prices: [
        {
          amount: v.price * 100, // مبلغ به cent
          currency_code: 'usd'
        }
      ],
      manage_inventory: true,
      allow_backorder: false
    }))
  });
  
  // 3. تنظیم موجودی اولیه
  for (const variant of product.data.product.variants) {
    const inventoryData = productData.variants.find(
      v => v.sku === variant.sku
    );
    
    if (inventoryData && inventoryData.inventory_item_id) {
      await apiClient.put(
        `/external/inventory/${inventoryData.inventory_item_id}`,
        {
          location_id: 'loc_123',
          stocked_quantity: inventoryData.quantity
        }
      );
    }
  }
  
  return product.data;
}
```

## مدیریت خطاها

### کدهای خطای رایج

| کد | توضیحات | راه حل |
|---|---|---|
| 400 | Bad Request - داده‌های ارسالی معتبر نیستند | بررسی کنید که تمام فیلدهای required ارسال شده‌اند |
| 401 | Unauthorized - احراز هویت ناموفق | credentials را بررسی کنید |
| 403 | Forbidden - دسترسی نداشته | مطمئن شوید به seller مربوطه دسترسی دارید |
| 404 | Not Found - منبع یافت نشد | ID را بررسی کنید |
| 429 | Too Many Requests - Rate limit | تعداد درخواست‌ها را کاهش دهید |
| 500 | Internal Server Error | با پشتیبانی تماس بگیرید |

### مثال مدیریت خطا

```javascript
async function safeApiCall(fn) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (error.response) {
        const status = error.response.status;
        
        // خطاهای قابل retry
        if (status === 429 || status >= 500) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // خطاهای دیگر
        throw new Error(
          `API Error ${status}: ${error.response.data.message || 'Unknown error'}`
        );
      }
      
      throw error;
    }
  }
}

// استفاده
try {
  const result = await safeApiCall(() => 
    apiClient.post('/external/products', productData)
  );
} catch (error) {
  console.error('Failed after retries:', error);
}
```

## Best Practices

### 1. استفاده از Idempotency

برای جلوگیری از ایجاد duplicate، از SKU به عنوان unique identifier استفاده کنید:

```javascript
async function upsertProduct(productData) {
  // جستجو با SKU
  const existing = await searchBySKU(productData.sku);
  
  if (existing) {
    return await updateProduct(existing.id, productData);
  } else {
    return await createProduct(productData);
  }
}
```

### 2. Batch Processing

برای کارایی بهتر، درخواست‌ها را batch کنید:

```javascript
async function processInBatches(items, batchSize, processor) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(processor)
    );
    results.push(...batchResults);
    
    // Delay بین batches برای respect کردن rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

### 3. Logging و Monitoring

```javascript
class APIClientWithLogging {
  async request(method, endpoint, data) {
    const startTime = Date.now();
    
    try {
      const result = await this.apiClient[method](endpoint, data);
      
      this.log({
        level: 'info',
        method,
        endpoint,
        duration: Date.now() - startTime,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      this.log({
        level: 'error',
        method,
        endpoint,
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  }
}
```

## محدودیت‌ها و نکات

- **Rate Limiting**: به rate limit اختصاص داده شده توجه کنید
- **File Upload**: برای آپلود تصاویر، از multipart/form-data استفاده کنید
- **Pagination**: برای لیست‌های بزرگ، از pagination استفاده کنید
- **Timezone**: تمام تاریخ‌ها به UTC هستند

## پشتیبانی

در صورت نیاز به کمک:
- مستندات Swagger: `/docs`
- ایمیل پشتیبانی: support@example.com

