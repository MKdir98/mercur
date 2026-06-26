import { updateProductsWorkflow } from '@medusajs/medusa/core-flows'
import { WorkflowResponse, createWorkflow } from '@medusajs/workflows-sdk'

import { AcceptRequestDTO } from '@mercurjs/framework'

import { activateProductCategoriesStep } from '../steps'
import { updateRequestWorkflow } from './update-request'

export const acceptProductRequestWorkflow = createWorkflow(
  'accept-product-request',
  function (input: AcceptRequestDTO) {
    const product = updateProductsWorkflow.runAsStep({
      input: {
        selector: { id: input.data.product_id },
        update: { status: 'published' }
      }
    })

    activateProductCategoriesStep({ product_id: input.data.product_id })

    updateRequestWorkflow.runAsStep({ input })
    return new WorkflowResponse(product)
  }
)
