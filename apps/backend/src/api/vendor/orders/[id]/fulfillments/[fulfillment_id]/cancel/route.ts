import { cancelOrderFulfillmentWorkflow } from '@medusajs/core-flows'
import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import PostexService from '../../../../../../../modules/postex/service'

/**
 * @oas [post] /vendor/orders/{id}/fulfillments/{fulfillment_id}/cancel
 * operationId: "VendorCancelOrderFulfillment"
 * summary: "Cancel order fulfillment."
 * description: "Cancel order fulfillment."
 * x-authenticated: true
 * parameters:
 * - in: path
 *   name: id
 *   required: true
 *   description: The ID of the Order.
 *   schema:
 *     type: string
 * - in: path
 *   name: fulfillment_id
 *   required: true
 *   description: The ID of the fulfillment.
 *   schema:
 *     type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             member:
 *               $ref: "#/components/schemas/VendorOrderDetails"
 * tags:
 *   - Vendor Orders
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentId = req.params.fulfillment_id

  const {
    data: [fulfillment]
  } = await query.graph({
    entity: 'fulfillment',
    fields: ['id', 'provider_id'],
    filters: {
      id: fulfillmentId
    }
  })

  if (fulfillment?.provider_id?.includes('postex')) {
    try {
      const postexConfig = {
        apiKey: process.env.POSTEX_API_KEY,
        apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
      }
      
      const postexService = new PostexService(req.scope, postexConfig)
      
      if (postexService && typeof postexService.canCancelFulfillment === 'function') {
        const canCancel = await postexService.canCancelFulfillment(fulfillmentId)
        
        if (!canCancel) {
          return res.status(400).json({
            message: 'امکان لغو مرسوله وجود ندارد: مرسوله پستکس در حال پردازش است و دیگر قابل لغو نیست'
          })
        }
      }
    } catch (error) {
      console.error('❌ [CANCEL FULFILLMENT] Error checking Postex cancel status:', error)
      return res.status(500).json({
        message: 'خطا در بررسی وضعیت مرسوله پستکس'
      })
    }
  }

  await cancelOrderFulfillmentWorkflow.run({
    container: req.scope,
    input: {
      order_id: req.params.id,
      fulfillment_id: req.params.fulfillment_id,
      canceled_by: req.auth_context.actor_id
    }
  })

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: req.queryConfig.fields,
    filters: {
      id: req.params.id
    }
  })

  res.json({ order })
}
