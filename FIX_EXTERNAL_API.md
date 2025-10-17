# راهنمای Fix کردن خطاهای External API

خطاهای TypeScript که داریم:

## 1. Import مشکلات

❌ **اشتباه:**
```typescript
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework";
```

✅ **درست:**
```typescript
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
```

## 2. Request Body Typing

❌ **اشتباه:**
```typescript
const { seller_id } = req.body;
```

✅ **درست:**
```typescript
// نیاز به validation type داریم
export async function POST(
  req: MedusaRequest<{ seller_id: string }>,
  res: MedusaResponse
): Promise<void> {
  const { seller_id } = req.validatedBody;
}
```

## 3. Service Resolve

❌ **اشتباه:**
```typescript
const apiClientService = req.scope.resolve(API_CLIENT_MODULE);
```

✅ **درست:**
```typescript
const apiClientService = req.scope.resolve(API_CLIENT_MODULE) as any;
// یا بهتر: تعریف type
```

## 4. Return در Route Handlers

❌ **اشتباه:**
```typescript
export async function GET(): Promise<void> {
  return res.json(...); // return نمیخواد
}
```

✅ **درست:**
```typescript
export async function GET(): Promise<void> {
  res.json(...); // بدون return
}
```

## 5. Update Methods

❌ **اشتباه:**
```typescript
await productService.updateProducts({
  id: req.params.id,
  ...req.body
});
```

✅ **درست:**
```typescript
await productService.updateProducts(req.params.id, req.validatedBody);
```

## 6. Delete Methods

❌ **اشتباه:**
```typescript
await productService.deleteProducts(req.params.id); // string
```

✅ **درست:**
```typescript
await productService.deleteProducts([req.params.id]); // array
```

## Fix سریع

برای سرعت بخشیدن، میتونی:

1. External API رو موقتاً غیرفعال کنی از `medusa-config.ts`:

```typescript
// کامنت کن:
// { resolve: '@mercurjs/api-client' },
```

2. بعداً با خیال راحت fix کنی

3. یا از این اسکریپت استفاده کن:

```bash
# اسکریپت سریع برای fix
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend/src/api/external

# Fix imports
find . -name "*.ts" -exec sed -i 's/from "@medusajs\/framework";/from "@medusajs\/framework\/utils";/g' {} \;

# اما بقیه خطاها نیاز به fix دستی دارن
```

## راه حل موقت

اگر میخوای فعلاً سایت بالا بیاد:

```typescript
// medusa-config.ts
modules: [
  // ... other modules
  // { resolve: '@mercurjs/api-client' },  // کامنت کن این خط رو
]
```

بعد:
```bash
cd /home/mehdi/all/repositories/github.com/mercur/apps/backend
yarn dev
```

External API فعلاً غیرفعال میشه ولی بقیه کارها OK میشن.

## Fix کامل

برای fix کامل باید:
1. تمام imports رو اصلاح کنی
2. Request types اضافه کنی
3. validatedBody به جای body استفاده کنی
4. Service calls رو با type صحیح بنویسی

زمان تقریبی: 30-60 دقیقه

آیا میخوای الان fix کنیم یا موقتاً غیرفعالش کنیم؟

