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
    fields: ['id', 'shipping_total', 'shipping_methods.shipping_option_id'],
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

    const blockRef = `postex_${id}_${Date.now()}`


    try {
      const postexConfig = {
        apiKey: process.env.POSTEX_API_KEY,
        apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
      }
      
      const postexService = new PostexService(req.scope, postexConfig)

      const tempFulfillmentId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const locationId = req.validatedBody.location_id
      
      const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION)
      postexShipmentData = await postexService.createPostexShipment(
        id,
        tempFulfillmentId,
        locationId,
        { query, knex, stockLocationModule, isBulk: false }
      )

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

  const workflowInput = {
    order_id: id,
    created_by: req.auth_context.actor_id,
    ...req.validatedBody
  }

  if (!workflowInput.items?.length) {
    const { data: [orderWithItems] } = await query.graph({
      entity: 'order',
      fields: [
        'items.id',
        'items.quantity',
        'items.raw_quantity',
        'items.detail.fulfilled_quantity',
        'items.detail.raw_fulfilled_quantity',
        'items.requires_shipping',
        'items.variant.product.shipping_profile.id'
      ],
      filters: { id }
    })
    const orderItems = orderWithItems?.items ?? []
    const fulfillableItems = orderItems
      .filter((i: any) => i.requires_shipping)
      .map((i: any) => {
        const qty = i.quantity ?? i.raw_quantity ?? 0
        const fulfilled = i.detail?.fulfilled_quantity ?? i.detail?.raw_fulfilled_quantity ?? 0
        const fulfillable = Math.max(0, Number(qty) - Number(fulfilled))
        return { ...i, fulfillable }
      })
      .filter((i: any) => i.fulfillable > 0)
    if (fulfillableItems.length) {
      workflowInput.items = fulfillableItems.map((i: any) => ({
        id: i.id,
        quantity: i.fulfillable
      }))
    }
  }

  let fulfillment
  try {
    const workflowResult = await createOrderFulfillmentWorkflow(
      req.scope
    ).run({
      input: workflowInput,
      throwOnError: true
    })
    fulfillment = workflowResult.result
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || 'خطا در ایجاد fulfillment'
    })
  }

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

      const labelUrl = `/vendor/orders/${id}/fulfillments/${fulfillment.id}/postex-label`
      await fulfillmentModule.updateFulfillment(fulfillment.id, {
        labels: [{
          tracking_number: postexShipmentData.tracking_number,
          tracking_url: postexShipmentData.tracking_url,
          label_url: labelUrl
        }]
      })

    } catch (error) {
      console.error('❌ [CREATE FULFILLMENT] Error linking fulfillment to Postex shipment:', error)
    }
  }

  res.json({ fulfillment })
}
