import { createHmac, timingSafeEqual } from "crypto"

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s || s === "supersecret") {
    console.warn("[customer-token] JWT_SECRET is not set or is insecure")
  }
  return s || "supersecret"
}

export function signCustomerToken(customerId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: customerId, iat: Date.now() })).toString("base64url")
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `cust.${payload}.${sig}`
}

export function verifyCustomerToken(token: string): string | null {
  if (!token.startsWith("cust.")) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [, payload, sig] = parts
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    return data.id ?? null
  } catch {
    return null
  }
}
