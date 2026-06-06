import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse
} from '@medusajs/framework'

import { createRedisCache } from '../../../../infrastructure/redis'

export function createListingCacheMiddleware(ttlSeconds: number) {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (process.env.ENABLE_REDIS_CACHE !== 'true' || req.method !== 'GET')
      return next()

    try {
      const locale = (req.headers['x-locale'] as string) ?? ''
      const cache = await createRedisCache('listing:')
      const cacheKey = `${req.path}:${JSON.stringify(req.query)}:${locale}`

      const cached = await cache.get(cacheKey)
      if (cached) return res.json(cached)

      const originalJson = res.json.bind(res)
      res.json = (data: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache
            .set(cacheKey, data, ttlSeconds)
            .catch((err) => console.error('Listing cache set error:', err))
        }
        return originalJson(data)
      }
    } catch (err) {
      console.error('Listing cache middleware error:', err)
    }

    next()
  }
}
