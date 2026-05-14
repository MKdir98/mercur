import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MiddlewareRoute, validateAndTransformQuery } from '@medusajs/framework'

import { resolveCustomTokenAuth } from '../../../shared/infra/http/middlewares/resolve-custom-token-auth'
import { orderSetQueryConfig } from './query-config'
import { StoreGetOrderSetParams } from './validators'

function requireAuth(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = (req as { auth_context?: { actor_id: string } }).auth_context?.actor_id
  if (actorId) return next()
  res.status(401).json({ message: 'Unauthorized' })
}

export const storeOrderSetMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/order-set',
    middlewares: [
      resolveCustomTokenAuth,
      requireAuth,
      validateAndTransformQuery(
        StoreGetOrderSetParams,
        orderSetQueryConfig.list
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/order-set/:id',
    middlewares: [
      resolveCustomTokenAuth,
      requireAuth,
      validateAndTransformQuery(
        StoreGetOrderSetParams,
        orderSetQueryConfig.retrieve
      )
    ]
  }
]
