import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreAddCartShippingMethodsType } from '@medusajs/medusa/api/store/carts/validators'

import {
  addSellerShippingMethodToCartWorkflow,
  removeCartShippingMethodsWorkflow
} from '../../../../../workflows/cart/workflows'
import { StoreDeleteCartShippingMethodsType } from '../../validators'

export const POST = async (
  req: MedusaRequest<StoreAddCartShippingMethodsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  console.log('🔴 [API] POST /carts/:id/shipping-methods called')
  console.log('🔴 [API] cart_id:', req.params.id)
  console.log('🔴 [API] option_id:', req.validatedBody.option_id)
  console.log('🔴 [API] data:', req.validatedBody.data)

  await addSellerShippingMethodToCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      option: {
        id: req.validatedBody.option_id,
        data: req.validatedBody.data
      }
    }
  })
  
  console.log('🔴 [API] Workflow completed successfully')

  const {
    data: [cart]
  } = await query.graph({
    entity: 'cart',
    filters: {
      id: req.params.id
    },
    fields: req.queryConfig.fields
  })

  res.json({ cart })
}

export const DELETE = async (
  req: MedusaRequest<StoreDeleteCartShippingMethodsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await removeCartShippingMethodsWorkflow.run({
    container: req.scope,
    input: req.validatedBody
  })

  const {
    data: [cart]
  } = await query.graph({
    entity: 'cart',
    filters: {
      id: req.params.id
    },
    fields: req.queryConfig.fields
  })

  res.json({ cart })
}
