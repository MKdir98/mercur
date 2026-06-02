import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { verifyCustomerToken } from '../../../../lib/auth/customer-token'

type AuthContext = { actor_id: string; actor_type: string }

/**
 * Populates req.auth_context from the custom `cust_<id>_<timestamp>` bearer token
 * issued by /store/auth/phone and /store/auth/login.
 *
 * Falls back to req.session.auth_context if already set by Medusa's session middleware.
 * Always calls next() — never rejects. Use a separate requireAuth middleware for that.
 */
export function resolveCustomTokenAuth(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Already resolved by Medusa's standard authenticate middleware
  if ((req as any).auth_context?.actor_id) return next()

  // Populated by the custom login session
  const sessionActorId = (req as any).session?.auth_context?.actor_id
  if (sessionActorId) {
    ;(req as any).auth_context = { actor_id: sessionActorId, actor_type: 'customer' } as AuthContext
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.slice(7) // remove "Bearer "
  const customerId = verifyCustomerToken(token)
  if (!customerId) return next()
  ;(req as any).auth_context = { actor_id: customerId, actor_type: 'customer' } as AuthContext
  next()
}
