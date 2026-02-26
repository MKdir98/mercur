import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import orderSplitOrderPayment from '../../../links/order-split-order-payment'

type OrderRow = { id: string; [key: string]: unknown }
type OrdersListResult = { rows?: OrderRow[]; metadata?: { count: number } }

export const fetchSplitOrderPaymentsByOrderIdsStep = createStep(
  'fetch-split-order-payments-by-order-ids',
  async (
    input: { ordersResult: OrdersListResult },
    { container }
  ) => {
    const rows = input.ordersResult?.rows ?? input.ordersResult
    const orderIds = Array.isArray(rows)
      ? (rows as OrderRow[]).map((o) => o.id)
      : []

    if (orderIds.length === 0) {
      return new StepResponse({})
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: linkRows } = await query.graph({
      entity: orderSplitOrderPayment.entryPoint,
      fields: ['order_id', '*split_order_payment'],
      filters: {
        order_id: orderIds
      }
    })

    const byOrderId: Record<string, unknown> = {}
    for (const row of linkRows ?? []) {
      const id = (row as { order_id?: string }).order_id
      if (id && (row as { split_order_payment?: unknown }).split_order_payment) {
        byOrderId[id] = (row as { split_order_payment: unknown }).split_order_payment
      }
    }
    return new StepResponse(byOrderId)
  }
)
