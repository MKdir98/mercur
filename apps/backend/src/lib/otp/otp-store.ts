export interface OTPData {
  code: string
  expiresAt: number
  attempts: number
  createdAt: number
}

const otpStore = new Map<string, OTPData>()

export function storeOTP(
  subjectKey: string,
  code: string,
  expiresInMinutes: number = 5
): void {
  const now = Date.now()

  otpStore.set(subjectKey, {
    code,
    expiresAt: now + expiresInMinutes * 60 * 1000,
    attempts: 0,
    createdAt: now,
  })
}

export function getOTP(subjectKey: string): OTPData | undefined {
  return otpStore.get(subjectKey)
}

export function deleteOTP(subjectKey: string): void {
  otpStore.delete(subjectKey)
}

export function incrementAttempts(subjectKey: string): number {
  const data = otpStore.get(subjectKey)

  if (!data) {
    return 0
  }

  data.attempts += 1
  otpStore.set(subjectKey, data)

  return data.attempts
}

export function isOTPExpired(subjectKey: string): boolean {
  const data = otpStore.get(subjectKey)

  if (!data) {
    return true
  }

  return data.expiresAt < Date.now()
}

export function cleanupExpiredOTPs(): void {
  const now = Date.now()
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(key)
    }
  }
}

setInterval(cleanupExpiredOTPs, 5 * 60 * 1000)
