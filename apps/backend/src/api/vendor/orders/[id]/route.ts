import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import orderSplitOrderPayment from '../../../../links/order-split-order-payment'
import { listOrderCommissionLinesWorkflow } from '../../../../workflows/commission/workflows'
import { getLastFulfillmentStatus } from '../../../../workflows/order/utils/aggregate-status'

const VENDOR_ORDER_RETRIEVE_FIELDS = [
  'id',
  'display_id',
  'email',
  'status',
  'version',
  'currency_code',
  'total',
  'subtotal',
  'item_total',
  'item_subtotal',
  'shipping_total',
  'shipping_subtotal',
  'shipping_tax_total',
  'discount_total',
  'discount_subtotal',
  'tax_total',
  'refundable_total',
  'metadata',
  'created_at',
  'updated_at',
  'region_id',
  'canceled_at',
  'items.id',
  'items.quantity',
  'items.raw_quantity',
  'items.requires_shipping',
  'items.title',
  'items.variant_sku',
  'items.unit_price',
  'items.original_unit_price',
  'items.subtotal',
  'items.thumbnail',
  'items.detail',
  'items.detail.quantity',
  'items.detail.raw_quantity',
  'items.detail.fulfilled_quantity',
  'items.detail.raw_fulfilled_quantity',
  'items.variant',
  'items.variant.options',
  'items.variant.product',
  'items.variant.product.shipping_profile.id',
  'items.variant.inventory.id',
  'items.variant.inventory.sku',
  'items.variant.inventory.location_levels.id',
  'items.variant.inventory.location_levels.location_id',
  'items.variant.inventory.location_levels.available_quantity',
  'items.variant.inventory.location_levels.stocked_quantity',
  'items.variant.inventory.location_levels.reserved_quantity',
  'items.created_at',
  'fulfillments.id',
  'fulfillments.items',
  'fulfillments.location_id',
  'fulfillments.provider_id',
  'fulfillments.requires_shipping',
  'fulfillments.packed_at',
  'fulfillments.shipped_at',
  'fulfillments.delivered_at',
  'fulfillments.canceled_at',
  'fulfillments.created_at',
  'fulfillments.labels',
  'fulfillments.labels.tracking_number',
  'fulfillments.labels.tracking_url',
  'fulfillments.labels.label_url',
  'shipping_methods.shipping_option_id'
]

/**
 * @oas [get] /vendor/orders/{id}
 * operationId: "VendorGetOrder"
 * summary: "Get Order details"
 * description: "Retrieves the details of specified order."
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
 *             order:
 *               $ref: "#/components/schemas/VendorOrderDetails"
 * tags:
 *   - Vendor Orders
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const logger = req.scope.resolve('logger')
  logger.info(`[VendorGetOrder] Fetching order ${id}`)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: VENDOR_ORDER_RETRIEVE_FIELDS,
    filters: { id }
  })

  if (!order) {
    logger.warn(`[VendorGetOrder] Order ${id} not found`)
    return res.status(404).json({
      message: `Order with id ${id} not found`
    })
  }

  const orderData = order as Record<string, unknown>
  orderData.fulfillments = orderData.fulfillments ?? []
  const shippingOptionId = (orderData.shipping_methods as Array<{ shipping_option_id?: string }>)?.[0]?.shipping_option_id
  if (shippingOptionId) {
    try {
      const { data: [shippingOption] } = await query.graph({
        entity: 'shipping_option',
        fields: ['id', 'shipping_option_type.id'],
        filters: { id: shippingOptionId }
      })
      const optionTypeId = (shippingOption as { shipping_option_type?: { id?: string } })?.shipping_option_type?.id
      if (optionTypeId && Array.isArray(orderData.fulfillments)) {
        (orderData.fulfillments as Array<Record<string, unknown>>).forEach((f) => {
          f.shipping_option_type_id = optionTypeId
        })
      }
    } catch {
    }
  }
  // Populate labels from postex_shipment table for fulfillments that have no labels
  if (Array.isArray(orderData.fulfillments)) {
    const fulfillmentsWithoutLabels = (orderData.fulfillments as Array<Record<string, unknown>>)
      .filter((f) => !Array.isArray(f.labels) || (f.labels as unknown[]).length === 0)
    if (fulfillmentsWithoutLabels.length > 0) {
      try {
        const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
        const fulfillmentIds = fulfillmentsWithoutLabels.map((f) => f.id as string)
        const rows = await knex('postex_shipment')
          .whereIn('fulfillment_id', fulfillmentIds)
          .whereNotNull('postex_tracking_code')
          .select('fulfillment_id', 'postex_tracking_code')
        const trackingByFulfillment = new Map<string, string>()
        for (const row of rows) {
          trackingByFulfillment.set(row.fulfillment_id, row.postex_tracking_code)
        }
        ;(orderData.fulfillments as Array<Record<string, unknown>>).forEach((f) => {
          const trackingCode = trackingByFulfillment.get(f.id as string)
          if (trackingCode) {
            f.labels = [{
              tracking_number: trackingCode,
              tracking_url: `https://tracking.postex.ir/${trackingCode}`,
              label_url: `/vendor/orders/${id}/fulfillments/${f.id}/postex-label`,
            }]
          }
        })
      } catch {
        // non-fatal: labels stay empty
      }
    }
  }

  const rawItems = (orderData.items ?? []) as Array<Record<string, unknown>>
  orderData.items = rawItems.map((item) => {
    const detail = item.detail as Record<string, unknown> | undefined
    const qty = item.quantity ?? item.raw_quantity ?? detail?.quantity ?? detail?.raw_quantity
    if (qty != null && item.quantity == null) {
      return { ...item, quantity: typeof qty === 'object' && qty !== null && 'value' in qty ? (qty as { value: string }).value : qty }
    }
    return item
  })

  const { data: splitPaymentRows } = await query.graph({
    entity: orderSplitOrderPayment.entryPoint,
    fields: ['order_id', '*split_order_payment'],
    filters: { order_id: id }
  })

  const splitPayment = splitPaymentRows?.[0]?.split_order_payment
  if (splitPayment) {
    orderData.split_order_payment = {
      ...splitPayment,
      authorized_amount: parseFloat(String(splitPayment.authorized_amount)) || 0,
      captured_amount: parseFloat(String(splitPayment.captured_amount)) || 0,
      refunded_amount: parseFloat(String(splitPayment.refunded_amount)) || 0,
    }
    orderData.payment_status = splitPayment.status
  }

  orderData.fulfillment_status = getLastFulfillmentStatus(
    orderData as unknown as Parameters<typeof getLastFulfillmentStatus>[0]
  )

  const items = (orderData.items ?? []) as Array<{
    quantity?: number
    raw_quantity?: number | string
    detail?: { fulfilled_quantity?: number; raw_fulfilled_quantity?: number | string }
  }>
  const unfulfilledCount = items.filter((i) => {
    const fulfilled =
      i.detail?.fulfilled_quantity ?? i.detail?.raw_fulfilled_quantity ?? 0
    const qty = i.quantity ?? i.raw_quantity ?? 0
    return Number(fulfilled) < Number(qty)
  }).length
  logger.info(`[VendorGetOrder] Order ${id} items=${items.length} unfulfilled=${unfulfilledCount}`)

  const { result: commission } = await listOrderCommissionLinesWorkflow(
    req.scope
  ).run({
    input: {
      order_id: id
    }
  })

  logger.info(`[VendorGetOrder] Order ${id} returned successfully`)
  res.json({ order: { ...order, ...commission } })
}
