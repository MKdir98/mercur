import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { createOrderFulfillmentWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import PostexService from '../../../../modules/postex/service'
import sellerOrderLink from '../../../../links/seller-order'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import { VendorPostexCollectionBodyType } from '../../orders/postex-collection/validators'

const POSTEX_ORDERS_LIST_FIELDS = [
  'id',
  'display_id',
  'email',
  'status',
  'total',
  'currency_code',
  'items.id',
  'items.title',
  'items.quantity',
  'items.raw_quantity',
  'items.detail.quantity',
  'items.detail.raw_quantity',
  'items.requires_shipping',
  'items.detail.fulfilled_quantity',
  'items.detail.raw_fulfilled_quantity',
  'shipping_methods.shipping_option_id'
]

const toNum = (v: unknown): number => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object' && v !== null && 'value' in v) return Number((v as { value: string }).value) || 0
  return Number(v) || 0
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const { data: sellerOrderRelations } = await query.graph({
    entity: sellerOrderLink.entryPoint,
    fields: ['order_id'],
    filters: {
      seller_id: seller.id,
      deleted_at: { $eq: null }
    }
  })

  const orderIds = sellerOrderRelations.map((r: { order_id: string }) => r.order_id)

  if (orderIds.length === 0) {
    return res.json({ orders: [] })
  }

  const { data: orders } = await query.graph({
    entity: 'order',
    fields: POSTEX_ORDERS_LIST_FIELDS,
    filters: { id: orderIds }
  })

  const shippingOptionIds = [
    ...new Set(
      (orders ?? [])
        .flatMap((o: Record<string, unknown>) =>
          (o.shipping_methods as Array<Record<string, unknown>>) ?? []
        )
        .map((sm: Record<string, unknown>) => sm.shipping_option_id as string)
        .filter(Boolean)
    )
  ]

  let postexOptionIds = new Set<string>()
  if (shippingOptionIds.length > 0) {
    const { data: shippingOptions } = await query.graph({
      entity: 'shipping_option',
      fields: ['id', 'provider_id'],
      filters: { id: shippingOptionIds }
    })
    postexOptionIds = new Set(
      (shippingOptions ?? [])
        .filter(
          (so: Record<string, unknown>) =>
            so.provider_id && String(so.provider_id).toLowerCase().includes('postex')
        )
        .map((so: Record<string, unknown>) => so.id as string)
    )
  }

  const postexOrders = (orders ?? []).filter((order: Record<string, unknown>) => {
    const hasUnfulfilled = (order.items as Array<Record<string, unknown>>)?.some(
      (i) => {
        if (!i.requires_shipping) return false
        const detail = i.detail as Record<string, unknown> | undefined
        const qty = toNum(i.quantity ?? i.raw_quantity ?? detail?.quantity ?? detail?.raw_quantity)
        const fulfilled = toNum(detail?.fulfilled_quantity ?? detail?.raw_fulfilled_quantity)
        return qty - fulfilled > 0
      }
    )
    const shippingMethods = (order.shipping_methods as Array<Record<string, unknown>>) ?? []
    const optionId = shippingMethods[0]?.shipping_option_id as string | undefined
    const isPostex = optionId ? postexOptionIds.has(optionId) : false
    const isCanceled = order.status === 'canceled' || order.status === 'cancelled'
    return hasUnfulfilled && !isCanceled && isPostex
  })

  res.json({
    orders: postexOrders.map((o: Record<string, unknown>) => {
      const items = (o.items as Array<Record<string, unknown>>) ?? []
      const shippingItems = items.filter((i) => i.requires_shipping)
      const summary = shippingItems.map((i) => {
        const qty = toNum(i.quantity ?? i.raw_quantity ?? (i.detail as Record<string, unknown>)?.quantity ?? (i.detail as Record<string, unknown>)?.raw_quantity)
        return `${i.title ?? 'کالا'} × ${qty}`
      }).join('، ')
      return {
        id: o.id,
        display_id: o.display_id,
        email: o.email,
        total: o.total,
        currency_code: o.currency_code,
        items_summary: summary || '-'
      }
    })
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<{ body: VendorPostexCollectionBodyType }>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const vb = req.validatedBody as Record<string, unknown>
  const order_ids = (vb?.order_ids ?? (vb?.body as Record<string, unknown>)?.order_ids) as string[]

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const { data: sellerOrderRelations } = await query.graph({
    entity: sellerOrderLink.entryPoint,
    fields: ['order_id'],
    filters: {
      seller_id: seller.id,
      order_id: order_ids,
      deleted_at: { $eq: null }
    }
  })

  const allowedOrderIds = new Set(
    sellerOrderRelations.map((r: { order_id: string }) => r.order_id)
  )

  const invalidOrderIds = order_ids.filter((id) => !allowedOrderIds.has(id))
  if (invalidOrderIds.length > 0) {
    return res.status(403).json({
      message: 'دسترسی به برخی سفارشات امکان‌پذیر نیست',
      invalid_order_ids: invalidOrderIds
    })
  }

  const postexConfig = {
    apiKey: process.env.POSTEX_API_KEY,
    apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
  }
  const postexService = new PostexService(req.scope, postexConfig)

  const shipments: Array<{
    order_id: string
    fulfillment_id: string
    tracking_number: string
    label_url: string
  }> = []
  const errors: Array<{ order_id: string; message: string }> = []

  for (const orderId of order_ids) {
    try {
      const {
        data: [order]
      } = await query.graph({
        entity: 'order',
        fields: [
          'id',
          'shipping_total',
          'shipping_methods.shipping_option_id',
          'items.id',
          'items.quantity',
          'items.raw_quantity',
          'items.detail.quantity',
          'items.detail.raw_quantity',
          'items.detail.fulfilled_quantity',
          'items.detail.raw_fulfilled_quantity',
          'items.requires_shipping',
          'items.variant.product.shipping_profile.id'
        ],
        filters: { id: orderId }
      })

      if (!order) {
        errors.push({ order_id: orderId, message: 'سفارش یافت نشد' })
        continue
      }

      const shippingOptionId = order.shipping_methods?.[0]?.shipping_option_id
      if (!shippingOptionId) {
        errors.push({ order_id: orderId, message: 'روش ارسال یافت نشد' })
        continue
      }

      const {
        data: [shippingOption]
      } = await query.graph({
        entity: 'shipping_option',
        fields: [
          'id',
          'provider_id',
          'shipping_profile_id',
          'service_zone.fulfillment_set.location.id'
        ],
        filters: { id: shippingOptionId }
      })

      if (!shippingOption?.provider_id?.includes('postex')) {
        errors.push({ order_id: orderId, message: 'سفارش از نوع پستکس نیست' })
        continue
      }

      const locationId =
        (shippingOption.service_zone?.fulfillment_set as { location?: { id?: string } })?.location?.id
      if (!locationId) {
        errors.push({ order_id: orderId, message: 'انبار مبدأ یافت نشد' })
        continue
      }

      const shippingProfileId = shippingOption.shipping_profile_id
      const fulfillableItems = (order.items || [])
        .filter(
          (item: any) => {
            if (!item.requires_shipping) return false
            const detail = item.detail || {}
            const qty = toNum(item.quantity ?? item.raw_quantity ?? detail.quantity ?? detail.raw_quantity)
            const fulfilled = toNum(detail.fulfilled_quantity ?? detail.raw_fulfilled_quantity)
            return qty - fulfilled > 0 && item.variant?.product?.shipping_profile?.id === shippingProfileId
          }
        )
        .map((item: any) => {
          const detail = item.detail || {}
          const qty = toNum(item.quantity ?? item.raw_quantity ?? detail.quantity ?? detail.raw_quantity)
          const fulfilled = toNum(detail.fulfilled_quantity ?? detail.raw_fulfilled_quantity)
          return { id: item.id, quantity: qty - fulfilled }
        })

      if (fulfillableItems.length === 0) {
        errors.push({
          order_id: orderId,
          message: 'اقلام قابل ارسال یافت نشد'
        })
        continue
      }

      let postexShipmentData: any = null

      try {
        const tempFulfillmentId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION)
        postexShipmentData = await postexService.createPostexShipment(
          orderId,
          tempFulfillmentId,
          locationId,
          { query, knex, stockLocationModule, isBulk: true }
        )
      } catch (postexError: any) {
        errors.push({
          order_id: orderId,
          message: postexError.message || 'خطا در ثبت مرسوله پستکس'
        })
        continue
      }

      const { result: fulfillment } = await createOrderFulfillmentWorkflow(
        req.scope
      ).run({
        input: {
          order_id: orderId,
          created_by: req.auth_context.actor_id,
          location_id: locationId,
          requires_shipping: true,
          items: fulfillableItems
        },
        throwOnError: true
      })

      await knex.raw(
        `UPDATE postex_shipment 
         SET fulfillment_id = ?, updated_at = NOW() 
         WHERE fulfillment_id LIKE 'temp_%' 
         AND order_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [fulfillment.id, orderId]
      )

      const labelUrl = `/vendor/orders/${orderId}/fulfillments/${fulfillment.id}/postex-label`
      await fulfillmentModule.updateFulfillment(fulfillment.id, {
        labels: [{
          tracking_number: postexShipmentData.tracking_number,
          tracking_url: postexShipmentData.tracking_url,
          label_url: labelUrl
        }]
      })

      shipments.push({
        order_id: orderId,
        fulfillment_id: fulfillment.id,
        tracking_number: postexShipmentData.tracking_number,
        label_url: labelUrl
      })
    } catch (error: any) {
      errors.push({
        order_id: orderId,
        message: error.message || 'خطای نامشخص'
      })
    }
  }

  res.json({
    shipments,
    errors: errors.length > 0 ? errors : undefined
  })
}
