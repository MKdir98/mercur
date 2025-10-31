/**
 * OTP Store for Backend
 * ذخیره و مدیریت کدهای OTP
 * در production باید از Redis استفاده کنید
 */

export interface OTPData {
  code: string
  expiresAt: number
  attempts: number
  createdAt: number
}

// In-memory storage (در production از Redis استفاده کنید)
const otpStore = new Map<string, OTPData>()

/**
 * ذخیره کد OTP برای یک شماره تلفن
 */
export function storeOTP(phone: string, code: string, expiresInMinutes: number = 5): void {
  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  const now = Date.now()

  otpStore.set(normalizedPhone, {
    code,
    expiresAt: now + expiresInMinutes * 60 * 1000,
    attempts: 0,
    createdAt: now,
  })
}

/**
 * دریافت اطلاعات OTP برای یک شماره
 */
export function getOTP(phone: string): OTPData | undefined {
  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  return otpStore.get(normalizedPhone)
}

/**
 * حذف OTP برای یک شماره
 */
export function deleteOTP(phone: string): void {
  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  otpStore.delete(normalizedPhone)
}

/**
 * افزایش تعداد تلاش‌های اشتباه
 */
export function incrementAttempts(phone: string): number {
  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  const data = otpStore.get(normalizedPhone)
  
  if (!data) {
    return 0
  }

  data.attempts += 1
  otpStore.set(normalizedPhone, data)
  
  return data.attempts
}

/**
 * بررسی اینکه آیا کد منقضی شده یا نه
 */
export function isOTPExpired(phone: string): boolean {
  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  const data = otpStore.get(normalizedPhone)
  
  if (!data) {
    return true
  }

  return data.expiresAt < Date.now()
}

/**
 * پاکسازی کدهای منقضی شده
 */
export function cleanupExpiredOTPs(): void {
  const now = Date.now()
  for (const [phone, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(phone)
    }
  }
}

// پاکسازی خودکار هر 5 دقیقه
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000)

