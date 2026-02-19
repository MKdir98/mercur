import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { createOrderFulfillmentWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { VendorCreateFulfillmentType } from '../../validators'
import PostexService from '../../../../../modules/postex/service'

/**
 * @oas [post] /vendor/products/{id}/fulfillments
 * operationId: "VendorCreateFulfillment"
 * summary: "Update a Product"
 * description: "Updates an existing product for the authenticated vendor."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Product.
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorCreateFulfillment"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             fulfillment:
 *               $ref: "#/components/schemas/VendorOrderFulfillment"
 * tags:
 *   - Vendor Orders
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateFulfillmentType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: ['id', 'shipping_methods.shipping_option_id'],
    filters: {
      id
    }
  })

  let providerId: string | null = null
  
  if (order?.shipping_methods?.[0]?.shipping_option_id) {
    const shippingOptionModule = req.scope.resolve(Modules.FULFILLMENT)
    const shippingOption = await shippingOptionModule.retrieveShippingOption(
      order.shipping_methods[0].shipping_option_id
    )
    providerId = shippingOption?.provider_id
  }

  let postexShipmentData: any = null

  if (providerId?.includes('postex')) {
    console.log('🔹 [CREATE FULFILLMENT] Postex provider detected, registering shipment BEFORE fulfillment creation')
    console.log('🔹 [CREATE FULFILLMENT] Request body:', JSON.stringify(req.validatedBody, null, 2))

    try {
      const postexConfig = {
        apiKey: process.env.POSTEX_API_KEY,
        apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
      }
      
      const postexService = new PostexService(req.scope, postexConfig)

      const tempFulfillmentId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const locationId = req.validatedBody.location_id
      
      postexShipmentData = await postexService.createPostexShipment(
        id,
        tempFulfillmentId,
        locationId
      )

      console.log('✅ [CREATE FULFILLMENT] Postex shipment registered successfully', {
        tracking_number: postexShipmentData.tracking_number,
        parcel_id: postexShipmentData.postex_parcel_id
      })

    } catch (error: any) {
      console.error('❌ [CREATE FULFILLMENT] Failed to register Postex shipment', {
        message: error.message
      })

      return res.status(400).json({
        message: `خطا در ثبت مرسوله پستکس: ${error.message}`
      })
    }
  } else {
    return res.status(500).json({
      message: 'فقط میتوانید مرسوله پستکس را ثبت کنید'
    })
  }

  const { result: fulfillment } = await createOrderFulfillmentWorkflow(
    req.scope
  ).run({
    input: {
      order_id: id,
      created_by: req.auth_context.actor_id,
      ...req.validatedBody
    },
    throwOnError: true
  })

  if (postexShipmentData) {
    try {
      const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

      await knex.raw(
        `UPDATE postex_shipment 
         SET fulfillment_id = ?, updated_at = NOW() 
         WHERE fulfillment_id LIKE 'temp_%' 
         AND order_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [fulfillment.id, id]
      )

      await fulfillmentModule.updateFulfillment(fulfillment.id, {
        labels: [{
          tracking_number: postexShipmentData.tracking_number,
          tracking_url: postexShipmentData.tracking_url,
          label_url: postexShipmentData.label_url
        }]
      })

      console.log('✅ [CREATE FULFILLMENT] Fulfillment created and linked to Postex shipment')

    } catch (error) {
      console.error('❌ [CREATE FULFILLMENT] Error linking fulfillment to Postex shipment:', error)
    }
  }

  res.json({ fulfillment })
}
