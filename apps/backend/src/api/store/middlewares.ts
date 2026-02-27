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

const IRAN_VAT_RATE = 0.1

const toNumber = (val: any): number => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && 'numeric_' in val) return (val as any).numeric_ ?? 0
  if (typeof val === 'object' && 'toNumber' in val) return (val as any).toNumber()
  return Number(val) || 0
}

const applyIranVatToCartResponse = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const originalJson = res.json.bind(res)
  res.json = (data: any) => {
    const cart = data?.cart ?? data
    if (cart && typeof cart === 'object' && 'items' in cart) {
      const countryCode = cart.shipping_address?.country_code?.toLowerCase?.()
      const taxTotal = toNumber(cart.tax_total)
      if (countryCode === 'ir' && taxTotal === 0) {
        const itemSubtotal = toNumber(cart.item_subtotal)
        const vatAmount = Math.round(itemSubtotal * IRAN_VAT_RATE)
        if (vatAmount > 0) {
          const currentTotal = toNumber(cart.total)
          const newTotal = currentTotal + vatAmount
          ;(data.cart ?? data).tax_total = vatAmount
          ;(data.cart ?? data).total = newTotal
        }
      }
    }
    return originalJson(data)
  }
  next()
}

export const storeMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/carts/:id',
    middlewares: [applyIranVatToCartResponse]
  },
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
    matcher: '/store/product-categories',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/homepage-media',
    middlewares: [bypassAuthInLocalDemo]
  },
  {
    matcher: '/store/support-tickets',
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
