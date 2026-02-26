import { OrderDetailDTO } from '@medusajs/framework/types'
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/framework/workflows-sdk'
import {
  GetOrdersListWorkflowInput,
  useRemoteQueryStep
} from '@medusajs/medusa/core-flows'

import { fetchSplitOrderPaymentsByOrderIdsStep } from '../steps/fetch-split-order-payments-by-order-ids'
import { prepareVendorOrdersQueryStep } from '../steps/prepare-vendor-orders-query'
import { getLastFulfillmentStatus } from '../utils/aggregate-status'

export const getVendorOrdersListWorkflow = createWorkflow(
  'get-vendor-orders-list',
  (input: WorkflowData<GetOrdersListWorkflowInput>) => {
    const queryConfig = prepareVendorOrdersQueryStep({
      fields: input.fields,
      variables: input.variables ?? {}
    })

    const orders = useRemoteQueryStep({
      entry_point: 'orders',
      fields: transform({ queryConfig }, ({ queryConfig }) => queryConfig.fields),
      variables: transform({ queryConfig }, ({ queryConfig }) => queryConfig.variables),
      list: true
    })

    const splitPaymentsByOrderId = fetchSplitOrderPaymentsByOrderIdsStep({
      ordersResult: orders
    })

    const aggregatedOrders = transform(
      { orders, splitPaymentsByOrderId },
      ({ orders, splitPaymentsByOrderId }) => {
        const orders_ = orders as { rows?: unknown[]; metadata?: unknown }
        const data = orders_.rows ? orders_.rows : (orders as unknown as unknown[])

        for (const order of data as Record<string, unknown>[]) {
          delete order.summary
          const splitPayment = splitPaymentsByOrderId[order.id as string]
          if (splitPayment && typeof splitPayment === 'object' && 'status' in splitPayment) {
            order.split_order_payment = splitPayment
            order.payment_status = (splitPayment as { status: string }).status
          } else {
            order.payment_status = undefined
          }
          order.fulfillment_status = getLastFulfillmentStatus(
            order as unknown as OrderDetailDTO
          ) as OrderDetailDTO['fulfillment_status']
        }

        return orders
      }
    )

    return new WorkflowResponse(aggregatedOrders)
  }
)
