const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function checkLoginRateLimit(key: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      return { allowed: false, remainingSeconds: Math.ceil((entry.resetAt - now) / 1000) }
    }
  }
  return { allowed: true }
}

export function recordLoginFailure(key: string): void {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export function resetLoginAttempts(key: string): void {
  store.delete(key)
}

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store.entries()) if (now >= v.resetAt) store.delete(k)
}, 5 * 60 * 1000)
