import { createCartWorkflow } from '@medusajs/core-flows'
import type {
  MedusaResponse,
  MedusaStoreRequest,
} from '@medusajs/framework/http'
import { refetchCart } from '@medusajs/medusa/api/store/carts/helpers'

import { resolveStoreLockedRegionIdOrThrow } from '../../../lib/resolve-store-locked-region-id'

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const locked = await resolveStoreLockedRegionIdOrThrow(req.scope)
  const base =
    req.validatedBody &&
    typeof req.validatedBody === 'object' &&
    !Array.isArray(req.validatedBody)
      ? (req.validatedBody as Record<string, unknown>)
      : {}
  const workflowInput = {
    ...base,
    customer_id: req.auth_context?.actor_id,
    ...(locked ? { region_id: locked } : {}),
  }
  const { result } = await createCartWorkflow(req.scope).run({
    input: workflowInput,
  })
  const cart = await refetchCart(result.id, req.scope, req.queryConfig.fields)
  res.status(200).json({ cart })
}
