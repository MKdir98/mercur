# راهنمای Debugging مشکل Authentication در Admin Panel

## مشکل
وقتی در admin panel لاگین میکنید، توکن `medusa_auth_token` در localStorage ذخیره نمیشه و در نتیجه API calls مثل `/admin/users/me` بدون Authorization header ارسال میشن.

## دلیل اصلی
Medusa v2 به طور پیش‌فرض از **Session-based Authentication** با استفاده از **HTTP Cookies** استفاده میکنه، نه Token-based Authentication.

## راه حل‌های پیاده‌سازی شده

### 1. Fetch Interceptor
فایل: `src/admin/lib/fetch-interceptor.ts`

این interceptor:
- همه fetch requestها رو می‌گیره
- `credentials: 'include'` رو برای ارسال cookies اضافه میکنه
- اگر توکنی در response وجود داشت، اونو در localStorage ذخیره میکنه
- اگر توکنی در localStorage هست، اونو به Authorization header اضافه میکنه

### 2. Auth Widget
فایل: `src/admin/widgets/auth-interceptor-init.tsx`

این widget:
- Interceptor رو initialize میکنه
- Cookies رو چک میکنه و اگر توکن پیدا کرد، در localStorage ذخیره میکنه
- هر 5 ثانیه authentication state رو چک میکنه

## Steps برای Debugging در Production

### گام 1: بررسی Console در Browser

بعد از لاگین، این پیام‌ها باید در console نمایش داده بشن:

```
[Admin] Auth widget initialized
[Admin] Fetch interceptor initialized
```

### گام 2: بررسی localStorage

در DevTools -> Application -> Local Storage بررسی کنید:
- آیا `medusa_auth_token` وجود داره؟

### گام 3: بررسی Cookies

در DevTools -> Application -> Cookies -> `http://core.doorfestival.com` بررسی کنید:
- آیا cookie با نام `_medusa_jwt` یا `connect.sid` وجود داره؟
- آیا این cookies دارای flag های درست هستند؟ (`HttpOnly`, `Secure`, `SameSite`)

### گام 4: بررسی Network Requests

در DevTools -> Network:

1. **Login Request** (`POST /auth/user/emailpass`):
   - Response باید `200 OK` باشه
   - در Response Headers بررسی کنید که `Set-Cookie` وجود داره
   - Response Body رو چک کنید - آیا `token` در response هست؟

2. **Me Request** (`GET /admin/users/me`):
   - Request Headers رو بررسی کنید
   - آیا `Cookie` header وجود داره؟
   - آیا `Authorization` header وجود داره؟

### گام 5: بررسی CORS

اگر admin panel و backend روی domainهای مختلف هستن، بررسی کنید:

```bash
# Check ADMIN_CORS environment variable
echo $ADMIN_CORS

# Should include your admin panel domain, example:
# ADMIN_CORS=http://localhost:7001,http://core.doorfestival.com
```

## راه حل‌های موقت برای تست

### روش 1: Manual Token Storage

بعد از لاگین موفق، در Console این دستور رو اجرا کنید:

```javascript
// Copy token from network response and store manually
const token = "YOUR_TOKEN_HERE"
localStorage.setItem('medusa_auth_token', token)
```

سپس صفحه رو refresh کنید.

### روش 2: استفاده از Cookie

اگر cookie به درستی set شده، میتونید از این تابع استفاده کنید:

```javascript
// Extract token from cookie and store in localStorage
function extractTokenFromCookie() {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === '_medusa_jwt') {
      localStorage.setItem('medusa_auth_token', value)
      console.log('Token stored from cookie')
      return value
    }
  }
  return null
}

extractTokenFromCookie()
```

## تنظیمات Production

### 1. Environment Variables

مطمئن شوید که این متغیرها به درستی set شدن:

```bash
# Backend URL
BACKEND_URL=http://core.doorfestival.com

# CORS Settings
ADMIN_CORS=http://core.doorfestival.com
STORE_CORS=http://your-storefront-domain.com
AUTH_CORS=http://core.doorfestival.com,http://your-storefront-domain.com

# JWT & Cookie Secrets
JWT_SECRET=your-secure-jwt-secret
COOKIE_SECRET=your-secure-cookie-secret

# Environment
NODE_ENV=production
```

### 2. Cookie Settings برای Production

در `medusa-config.ts`:

```typescript
http: {
  adminCors: process.env.ADMIN_CORS!,
  storeCors: process.env.STORE_CORS!,
  authCors: process.env.AUTH_CORS!,
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
  // Add cookie options for production
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
    sameSite: 'lax', // or 'strict' depending on your setup
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}
```

### 3. Nginx/Proxy Configuration

اگر از Nginx استفاده میکنید، مطمئن شوید که cookies به درستی proxy میشن:

```nginx
location / {
    proxy_pass http://backend:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Important for cookies
    proxy_pass_header Set-Cookie;
    proxy_cookie_domain localhost $host;
    proxy_cookie_path / /;
}
```

## تست نهایی

بعد از deploy:

1. پنل ادمین رو باز کنید
2. با یک user معتبر لاگین کنید
3. Console رو باز کنید و این دستور رو اجرا کنید:

```javascript
// Check authentication state
console.log('Token in localStorage:', localStorage.getItem('medusa_auth_token'))
console.log('All cookies:', document.cookie)
console.log('Is authenticated:', !!localStorage.getItem('medusa_auth_token'))
```

4. یک API call تست کنید:

```javascript
fetch('/admin/users/me', {
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('medusa_auth_token')}`
  }
})
.then(r => r.json())
.then(data => console.log('User data:', data))
.catch(err => console.error('Error:', err))
```

## اگر هنوز کار نکرد...

اگر بعد از این همه debugging هنوز مشکل داشتید:

1. لاگ‌های سرور رو بررسی کنید
2. بررسی کنید که آیا authentication middleware روی `/admin/users/me` فعال هست
3. بررسی کنید که آیا session store (Redis یا Memory) به درستی کار میکنه

برای دریافت کمک بیشتر، این اطلاعات رو جمع‌آوری کنید:
- Screenshot از Network tab برای login و me requests
- Screenshot از Cookies و LocalStorage
- Console logs
- Server logs

