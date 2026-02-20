import { MiddlewareRoute, authenticate } from '@medusajs/framework'
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { storeCartsMiddlewares } from './carts/middlewares'
import { storeOrderSetMiddlewares } from './order-set/middlewares'
import { storeOrderReturnRequestsMiddlewares } from './return-request/middlewares'
import { storeReturnsMiddlewares } from './returns/middlewares'
import { storeReviewMiddlewares } from './reviews/middlewares'
import { storeSellerMiddlewares } from './seller/middlewares'
import { storeShippingOptionRoutesMiddlewares } from './shipping-options/middlewares'
import { storeWishlistMiddlewares } from './wishlist/middlewares'

// Middleware که در local/demo authentication رو bypass می‌کنه
const bypassAuthInLocalDemo = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const isLocal = process.env.APP_ENV === 'local' || process.env.APP_ENV === 'demo'
  
  if (isLocal) {
    // در local/demo، publishable key رو bypass می‌کنیم
    return next()
  }
  
  // در production، authentication لازمه (ولی برای auth endpoints نباید authenticate بخوایم)
  return next()
}

export const storeMiddlewares: MiddlewareRoute[] = [
  // Auth endpoints - بدون نیاز به authentication
  {
    matcher: '/store/auth/*',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/customers/phone/*',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/customer/*',
    middlewares: [bypassAuthInLocalDemo]
  },
  // Public endpoints - بدون نیاز به authentication
  {
    matcher: '/store/brands',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/seller*',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/popular-products',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/featured-sellers',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/rich-products',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/reviews/*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  {
    matcher: '/store/return-request/*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  ...storeCartsMiddlewares,
  ...storeOrderReturnRequestsMiddlewares,
  ...storeOrderSetMiddlewares,
  ...storeReviewMiddlewares,
  ...storeSellerMiddlewares,
  ...storeShippingOptionRoutesMiddlewares,
  ...storeWishlistMiddlewares,
  ...storeReturnsMiddlewares
]
