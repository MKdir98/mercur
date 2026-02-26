import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { completeOrderWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { getVendorOrdersListWorkflow } from '../../../../../workflows/order/workflows'

const ORDER_ITEMS_FIELDS = [
  'id',
  'items.id',
  'items.quantity',
  'items.raw_quantity',
  'items.detail'
]

const hasUnfulfilledItems = (order: Record<string, unknown>) => {
  const items = (order?.items ?? []) as Array<{
    quantity?: number
    raw_quantity?: number | string
    detail?: { fulfilled_quantity?: number; raw_fulfilled_quantity?: number | string }
  }>
  return items.some((item) => {
    const fulfilled =
      item.detail?.fulfilled_quantity ??
      item.detail?.raw_fulfilled_quantity ??
      0
    const quantity = item.quantity ?? item.raw_quantity ?? 0
    return Number(fulfilled) < Number(quantity)
  })
}

/**
 * @oas [post] /vendor/orders/{id}/complete
 * operationId: "VendorCompleteOrder"
 * summary: "Mark order as complete"
 * description: "Mark order as complete."
 * x-authenticated: true
 * parameters:
 * - in: path
 *   name: id
 *   required: true
 *   description: The ID of the Order.
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
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [orderToCheck]
  } = await query.graph({
    entity: 'order',
    fields: ORDER_ITEMS_FIELDS,
    filters: { id }
  })

  if (!orderToCheck) {
    return res.status(404).json({
      message: `Order with id ${id} not found`
    })
  }

  const orderData = orderToCheck as Record<string, unknown>
  orderData.items = orderData.items ?? []

  if (hasUnfulfilledItems(orderData)) {
    const logger = req.scope.resolve('logger')
    logger.warn(
      `[VendorCompleteOrder] Rejected: order ${id} has unfulfilled items, orderId=${id}, itemsCount=${(orderData.items as unknown[]).length}`
    )
    return res.status(400).json({
      message:
        'Cannot complete order: there are unfulfilled items. Please fulfill all items before completing the order.'
    })
  }

  const logger = req.scope.resolve('logger')
  logger.info(`[VendorCompleteOrder] Completing order ${id}`)

  await completeOrderWorkflow(req.scope).run({
    input: {
      orderIds: [id]
    }
  })

  const {
    result: [order]
  } = await getVendorOrdersListWorkflow(req.scope).run({
    input: {
      fields: req.queryConfig.fields,
      variables: {
        filters: {
          id
        }
      }
    }
  })

  logger.info(`[VendorCompleteOrder] Order ${id} completed successfully`)
  res.json({ order })
}
