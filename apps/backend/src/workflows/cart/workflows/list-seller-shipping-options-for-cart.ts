import { listShippingOptionsForCartWorkflow } from '@medusajs/medusa/core-flows'
import {
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/workflows-sdk'

import { filterSellerShippingOptionsStep } from '../steps'

export const listSellerShippingOptionsForCartWorkflow = createWorkflow(
  'list-seller-shipping-options-for-cart',
  function (input: { cart_id: string; is_return: boolean }) {
    console.log('🟦 [WORKFLOW] Starting list-seller-shipping-options - input:', input)
    
    const shipping_options = listShippingOptionsForCartWorkflow.runAsStep({
      input
    })

    const filterPayload = transform(
      { shipping_options, input },
      ({ shipping_options, input }) => {
        console.log('🟦 [WORKFLOW] Medusa shipping options received:', shipping_options?.length || 0, 'options')
        console.log('🟦 [WORKFLOW] Options IDs:', shipping_options?.map((o: any) => o.id) || [])
        
        return {
          shipping_options,
          cart_id: input.cart_id
        }
      }
    )
    return new WorkflowResponse(filterSellerShippingOptionsStep(filterPayload))
  }
)
