import crypto from "crypto"

export interface VerificationTokenData {
  phone: string
  expiresAt: number
}

const VERIFICATION_TOKEN_EXPIRY_MINUTES = 10
const tokenStore = new Map<string, VerificationTokenData>()

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function createVerificationToken(phone: string): string {
  const normalizedPhone = phone.replace(/[^0-9+]/g, "")
  const token = generateToken()
  const expiresAt = Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000

  tokenStore.set(token, {
    phone: normalizedPhone,
    expiresAt,
  })

  return token
}

export function consumeVerificationToken(
  token: string,
  phone: string
): boolean {
  const normalizedPhone = phone.replace(/[^0-9+]/g, "")
  const data = tokenStore.get(token)

  if (!data) {
    return false
  }

  if (data.phone !== normalizedPhone) {
    return false
  }

  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token)
    return false
  }

  tokenStore.delete(token)
  return true
}

export function cleanupExpiredVerificationTokens(): void {
  const now = Date.now()
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token)
    }
  }
}

setInterval(cleanupExpiredVerificationTokens, 5 * 60 * 1000)
