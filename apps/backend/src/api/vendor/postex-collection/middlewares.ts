import {
  MiddlewareRoute,
  validateAndTransformBody
} from '@medusajs/framework'

import { VendorPostexCollectionBody } from '../orders/postex-collection/validators'

export const vendorPostexCollectionMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/postex-collection/orders',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/vendor/postex-collection/orders',
    middlewares: [validateAndTransformBody(VendorPostexCollectionBody)]
  }
]
