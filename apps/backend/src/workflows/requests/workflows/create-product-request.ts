import {
  createProductsWorkflow,
  createRemoteLinkStep
} from '@medusajs/medusa/core-flows'
import {
  WorkflowResponse,
  createHook,
  createStep,
  createWorkflow,
  StepResponse,
  transform
} from '@medusajs/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import slugify from 'slugify'

import {
  CreateRequestDTO,
  ProductRequestUpdatedEvent,
  RequestStatus,
  RequestUpdated
} from '@mercurjs/framework'
import { REQUESTS_MODULE } from '@mercurjs/requests'
import { SELLER_MODULE } from '@mercurjs/seller'

import { emitMultipleEventsStep } from '../../common/steps'
import { createRequestStep } from '../steps'

function generateUrlSafeHandle(title: string): string {
  const slug = slugify(title, {
    lower: true,           
    strict: true,          
    locale: 'en',          
    trim: true             
  })
  
  return slug || `product-${Date.now()}`
}

export const createProductRequestWorkflow = createWorkflow(
  'create-product-request',
  function (input: {
    data: CreateRequestDTO
    seller_id: string
    additional_data?: any
  }) {
    const productPayload = transform(input, (input) => {
      const payload = {
        ...input.data.data,
        status: input.data.data.status === 'draft' ? 'draft' : 'proposed'
      }
      
      if (!payload.handle && payload.title) {
        payload.handle = generateUrlSafeHandle(payload.title)
      }
      
      return payload
    })
    
    const product = createProductsWorkflow.runAsStep({
      input: {
        products: [productPayload],
        additional_data: transform(input, (input) => ({
          ...input.additional_data,
          seller_id: input.seller_id
        }))
      }
    })

    const requestPayload = transform(
      { input, productPayload, product },
      ({ input, productPayload, product }) => ({
        ...input.data,
        data: {
          ...productPayload,
          product_id: product[0].id
        },
        status:
          productPayload.status === 'draft'
            ? ('draft' as RequestStatus)
            : ('pending' as RequestStatus)
      })
    )

    const request = createRequestStep(requestPayload)

    const link = transform({ request, input }, ({ request, input }) => {
      return [
        {
          [SELLER_MODULE]: {
            seller_id: input.seller_id
          },
          [REQUESTS_MODULE]: {
            request_id: request[0].id
          }
        }
      ]
    })

    createRemoteLinkStep(link)

    emitMultipleEventsStep([
      {
        name: RequestUpdated.CREATED,
        data: { ...input.data, sellerId: input.seller_id }
      },
      {
        name: ProductRequestUpdatedEvent.CREATED,
        data: { id: request[0].id }
      }
    ])

    const productRequestCreatedHook = createHook('productRequestCreated', {
      requestId: request[0].id,
      sellerId: input.seller_id
    })
    return new WorkflowResponse(request, {
      hooks: [productRequestCreatedHook]
    })
  }
)
