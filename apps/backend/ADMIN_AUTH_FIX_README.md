# حل مشکل Authentication در Admin Panel

## خلاصه مشکل
وقتی در admin panel لاگین می‌کنید، توکن authentication در localStorage ذخیره نمیشد و در نتیجه API calls بدون Authorization header ارسال می‌شدند.

## تغییرات اعمال شده

### 1. Fetch Interceptor (فایل جدید)
**مسیر:** `src/admin/lib/fetch-interceptor.ts`

این interceptor:
- ✅ همه fetch requests رو می‌گیره
- ✅ `credentials: 'include'` اضافه میکنه (برای ارسال cookies)
- ✅ توکن رو از localStorage می‌خونه و به Authorization header اضافه میکنه
- ✅ توکن‌های دریافتی در response رو خودکار ذخیره میکنه
- ✅ XMLHttpRequest رو هم intercept میکنه

### 2. Auth Widget (فایل جدید)
**مسیر:** `src/admin/widgets/auth-interceptor-init.tsx`

این widget:
- ✅ Interceptor رو initialize میکنه
- ✅ Cookies رو چک میکنه و توکن رو extract میکنه
- ✅ هر 5 ثانیه auth state رو بررسی میکنه

### 3. Auth Hook (فایل جدید)
**مسیر:** `src/admin/hooks/use-auth-interceptor.ts`

یک React hook ساده برای initialize کردن interceptor در components

### 4. تغییر در mercurQuery
**مسیر:** `src/admin/lib/client.ts`

اضافه شدن `credentials: 'include'` به همه requests

### 5. تغییر در Routes
اضافه شدن `useAuthInterceptor()` hook به:
- `routes/sellers/page.tsx`
- `routes/attributes/page.tsx`

## نحوه استفاده

### بعد از Deploy

1. **لاگین کنید**
2. **Console Browser رو باز کنید** (F12)
3. **بررسی کنید که این پیام‌ها نمایش داده میشن:**
   ```
   [Admin] Fetch interceptor initialized
   [Admin] Auth widget initialized
   ```

### تست Manual

برای تست اینکه توکن ذخیره شده یا نه، در Console این دستورات رو اجرا کنید:

```javascript
// 1. بررسی localStorage
console.log('Token:', localStorage.getItem('medusa_auth_token'))

// 2. بررسی همه cookies
console.log('Cookies:', document.cookie)

// 3. تست API call
fetch('/admin/users/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)

// 4. استفاده از helper functions
window.__medusa_getAuthToken()  // دریافت توکن
window.__medusa_storeAuthToken('your-token')  // ذخیره دستی توکن
```

## راه حل موقت برای Production الان

اگه الان روی production هستید و میخواید فوری تست کنید:

### روش 1: استخراج توکن از Network Tab

1. DevTools -> Network رو باز کنید
2. لاگین کنید
3. Request `POST /auth/user/emailpass` رو پیدا کنید
4. در Response Tab، توکن رو کپی کنید
5. در Console این دستور رو اجرا کنید:

```javascript
localStorage.setItem('medusa_auth_token', 'PASTE_TOKEN_HERE')
```

6. صفحه رو refresh کنید

### روش 2: استخراج از Cookie

اگه توکن در cookie ذخیره شده، این script رو در Console اجرا کنید:

```javascript
function extractTokenFromCookie() {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === '_medusa_jwt' || name === 'medusa_auth_token') {
      localStorage.setItem('medusa_auth_token', value)
      console.log('✅ Token stored:', value.substring(0, 20) + '...')
      location.reload()
      return
    }
  }
  console.log('❌ No auth cookie found')
}

extractTokenFromCookie()
```

## بررسی مشکلات احتمالی

### مشکل 1: توکن هنوز ذخیره نمیشه

**Solution:**
- بررسی کنید که `medusa-config.ts` به درستی build شده
- Server رو restart کنید: `npm run dev` یا rebuild کنید

### مشکل 2: API ها هنوز بدون توکن call میشن

**Solution:**
- بررسی کنید که interceptor قبل از اولین API call load شده
- Hard refresh کنید: `Ctrl+Shift+R` یا `Cmd+Shift+R`

### مشکل 3: CORS Error

**Solution:**
بررسی کنید که `ADMIN_CORS` environment variable شامل domain شما هست:

```bash
ADMIN_CORS=http://core.doorfestival.com
```

## فایل‌های مهم برای Debugging

اگه مشکل داشتید، این فایل‌ها رو بررسی کنید:

1. **Browser Console** - برای error messages
2. **DevTools -> Application -> Local Storage** - برای بررسی token
3. **DevTools -> Application -> Cookies** - برای بررسی cookies
4. **DevTools -> Network** - برای بررسی headers
5. **Server Logs** - برای بررسی authentication errors

## راهنمای کامل Debugging

برای راهنمای جامع و کامل debugging، فایل زیر رو بخونید:

📖 **[AUTH_DEBUGGING_GUIDE.md](./AUTH_DEBUGGING_GUIDE.md)**

## پشتیبانی

اگه بعد از این تغییرات هنوز مشکل دارید، اطلاعات زیر رو جمع‌آوری کنید:

- [ ] Screenshot از Console (با همه errors)
- [ ] Screenshot از Network tab (Login request + Me request)
- [ ] Screenshot از Application -> Storage
- [ ] متن دقیق error message
- [ ] Environment (Local / Production)
- [ ] Browser & Version

---

**نکته مهم:** این تغییرات backward-compatible هستند و authentication قبلی رو break نمیکنند.

