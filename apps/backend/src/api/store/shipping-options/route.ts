import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { listSellerShippingOptionsForCartWorkflow } from '../../../workflows/cart/workflows'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id, is_return } = req.filterableFields as {
    cart_id: string
    is_return: boolean
  }

  console.log('🔷 [API /store/shipping-options] Request received:', { cart_id, is_return })

  const { result: shipping_options } =
    await listSellerShippingOptionsForCartWorkflow.run({
      container: req.scope,
      input: { cart_id, is_return: !!is_return }
    })

  console.log('🔷 [API /store/shipping-options] Returning:', shipping_options?.length || 0, 'options')

  res.json({ shipping_options })
}
