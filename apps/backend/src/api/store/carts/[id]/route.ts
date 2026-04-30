import { updateCartWorkflowId } from '@medusajs/core-flows'
import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { refetchCart } from '@medusajs/medusa/api/store/carts/helpers'

import { runUpdateCartWorkflowOrBypassForExtraShippingCountries } from '../../../../lib/cart-update-bypass-region-shipping'
import { shouldAllowExtraShippingCountry } from '../../../../lib/extra-shipping-countries'
import { resolveStoreLockedRegionIdOrThrow } from '../../../../lib/resolve-store-locked-region-id'

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const locked = await resolveStoreLockedRegionIdOrThrow(req.scope)
  if (locked) {
    const snapshot = await refetchCart(req.params.id, req.scope, [
      'id',
      'region_id',
    ])
    if (snapshot && snapshot.region_id !== locked) {
      const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
      await we.run(updateCartWorkflowId, {
        input: { id: req.params.id, region_id: locked },
        transactionId: 'cart-lock-region-' + req.params.id,
      })
    }
  }
  const cart = await refetchCart(req.params.id, req.scope, req.queryConfig.fields)
  res.json({ cart })
}

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const locked = await resolveStoreLockedRegionIdOrThrow(req.scope)
  const base =
    req.validatedBody &&
    typeof req.validatedBody === 'object' &&
    !Array.isArray(req.validatedBody)
      ? (req.validatedBody as Record<string, unknown>)
      : {}
  const input: Record<string, unknown> = {
    ...base,
    id: req.params.id,
    ...(locked ? { region_id: locked } : {}),
  }
  const shippingCountry = (
    base.shipping_address as { country_code?: string } | undefined
  )?.country_code
  await runUpdateCartWorkflowOrBypassForExtraShippingCountries(
    req.scope,
    updateCartWorkflowId,
    input,
    shouldAllowExtraShippingCountry(shippingCountry)
  )
  const cart = await refetchCart(req.params.id, req.scope, req.queryConfig.fields)
  res.status(200).json({ cart })
}
