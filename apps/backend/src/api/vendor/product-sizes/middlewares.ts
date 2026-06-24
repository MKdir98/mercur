import { MiddlewareRoute } from '@medusajs/framework'

export const vendorProductSizesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/product-sizes',
    middlewares: [],
  },
]
