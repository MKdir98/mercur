import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Redis connection failed after 10 retries')
        }
        return Math.min(retries * 100, 3000)
      },
    },
  })

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  redisClient.on('connect', () => {
    console.log('Redis Client Connected')
  })

  redisClient.on('reconnecting', () => {
    console.log('Redis Client Reconnecting...')
  })

  await redisClient.connect()

  return redisClient
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit()
    redisClient = null
  }
}

export class RedisCache {
  private client: RedisClientType
  private prefix: string

  constructor(client: RedisClientType, prefix: string = '') {
    this.client = client
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}${key}` : key
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.getKey(key))
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value)
      if (ttlSeconds) {
        await this.client.setEx(this.getKey(key), ttlSeconds, stringValue)
      } else {
        await this.client.set(this.getKey(key), stringValue)
      }
      return true
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(this.getKey(key))
      return true
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key))
      return result === 1
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(this.getKey(key))
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error)
      throw error
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(this.getKey(key))
    } catch (error) {
      console.error(`Redis DECR error for key ${key}:`, error)
      throw error
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(this.getKey(key), seconds)
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error)
      return false
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(this.getKey(key))
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error)
      return -1
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const prefixedKeys = keys.map((k) => this.getKey(k))
      const values = await this.client.mGet(prefixedKeys)
      return values.map((v) => (v ? JSON.parse(v) : null))
    } catch (error) {
      console.error('Redis MGET error:', error)
      return keys.map(() => null)
    }
  }

  async mset(keyValues: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    try {
      const entries: [string, string][] = Object.entries(keyValues).map(([k, v]) => [
        this.getKey(k),
        JSON.stringify(v),
      ])

      await this.client.mSet(entries)

      if (ttlSeconds) {
        await Promise.all(entries.map(([k]) => this.client.expire(k, ttlSeconds)))
      }

      return true
    } catch (error) {
      console.error('Redis MSET error:', error)
      return false
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(this.getKey(pattern))
      return keys.map((k) => k.replace(this.prefix, ''))
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error)
      return []
    }
  }
}

export function createRedisCache(prefix: string): Promise<RedisCache> {
  return getRedisClient().then((client) => new RedisCache(client, prefix))
}






