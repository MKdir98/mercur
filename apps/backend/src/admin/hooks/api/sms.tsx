import { useEffect, useState, useCallback } from 'react'

export interface SandboxMessage {
  id: string
  phone: string
  code: string
  message: string
  timestamp: number
  expiresAt: number
}

export function useSandboxSms() {
  const [messages, setMessages] = useState<SandboxMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window?.__STOREFRONT_URL__ || 'http://localhost:3000' : 'http://localhost:3000'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${baseUrl}/api/auth/sandbox-messages`, { credentials: 'include' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Failed to load messages')
      setMessages(data.messages || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  const clear = useCallback(async () => {
    setLoading(true)
    try {
      await fetch(`${baseUrl}/api/auth/sandbox-messages`, { method: 'DELETE' })
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  useEffect(() => { load() }, [load])

  return { messages, loading, error, reload: load, clear }
}
