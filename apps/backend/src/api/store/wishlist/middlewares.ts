import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework'
import {
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'

import customerWishlist from '../../../links/customer-wishlist'
import { checkCustomerResourceOwnershipByResourceId } from '../../../shared/infra/http/middlewares/check-customer-ownership'
import { storeWishlistQueryConfig } from './query-config'
import { StoreCreateWishlist, StoreGetWishlistsParams } from './validators'

function resolveCustomTokenAuth(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const existing = (req as { auth_context?: { actor_id: string } }).auth_context?.actor_id
  if (existing) return next()

  const sessionAuth = (req as { session?: { auth_context?: { actor_id: string } } }).session?.auth_context?.actor_id
  if (sessionAuth) {
    ;(req as unknown as { auth_context: { actor_id: string; actor_type: string } }).auth_context = {
      actor_id: sessionAuth,
      actor_type: 'customer'
    }
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.replace('Bearer ', '')
  if (!token.startsWith('cust_')) return next()

  const withoutPrefix = token.substring(5)
  const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_')
  if (lastUnderscoreIndex <= 0) return next()

  const customerId = withoutPrefix.substring(0, lastUnderscoreIndex)
  ;(req as unknown as { auth_context: { actor_id: string; actor_type: string } }).auth_context = {
    actor_id: customerId,
    actor_type: 'customer'
  }
  next()
}

function requireWishlistAuth(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = (req as { auth_context?: { actor_id: string } }).auth_context?.actor_id
  if (actorId) return next()
  res.status(401).json({ message: 'Unauthorized' })
}

export const storeWishlistMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/wishlist',
    middlewares: [
      resolveCustomTokenAuth,
      requireWishlistAuth,
      validateAndTransformQuery(
        StoreGetWishlistsParams,
        storeWishlistQueryConfig.list
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/wishlist',
    middlewares: [
      resolveCustomTokenAuth,
      requireWishlistAuth,
      validateAndTransformQuery(
        StoreGetWishlistsParams,
        storeWishlistQueryConfig.retrieve
      ),
      validateAndTransformBody(StoreCreateWishlist)
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/store/wishlist/:id/product/:reference_id',
    middlewares: [
      resolveCustomTokenAuth,
      requireWishlistAuth,
      checkCustomerResourceOwnershipByResourceId({
        entryPoint: customerWishlist.entryPoint,
        filterField: 'wishlist_id'
      })
    ]
  }
]
