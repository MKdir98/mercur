import { listShippingOptionsForCartWorkflow } from '@medusajs/medusa/core-flows'
import {
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/workflows-sdk'

import {
  filterSellerShippingOptionsStep,
  getSellerShippingOptionIdsStep
} from '../steps'

export const listSellerShippingOptionsForCartWorkflow = createWorkflow(
  'list-seller-shipping-options-for-cart',
  function (input: { cart_id: string; is_return: boolean }) {
    console.log('🟦 [WORKFLOW] Starting - cart_id:', input.cart_id, 'is_return:', input.is_return)

    const sellerOptions = getSellerShippingOptionIdsStep(input)

    const medusaInput = transform(
      { sellerOptions, input },
      ({ sellerOptions, input }) => {
        const payload = {
          cart_id: input.cart_id,
          is_return: input.is_return,
          option_ids: sellerOptions.option_ids
        }
        console.log('🟦 [WORKFLOW] Passing to Medusa:', payload)
        return payload
      }
    )

    const shipping_options = listShippingOptionsForCartWorkflow.runAsStep({
      input: medusaInput
    })

    const filterPayload = transform(
      { shipping_options, sellerOptions },
      ({ shipping_options, sellerOptions }) => {
        const payload = {
          shipping_options: shipping_options ?? [],
          cart_id: sellerOptions.cart_id,
          seller_options: sellerOptions.seller_options
        }
        console.log('🟦 [WORKFLOW] Medusa result count:', payload.shipping_options.length)
        return payload
      }
    )

    return new WorkflowResponse(filterSellerShippingOptionsStep(filterPayload))
  }
)
