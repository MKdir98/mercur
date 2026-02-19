import { Modules } from '@medusajs/framework/utils'
import { transform, when } from '@medusajs/framework/workflows-sdk'
import {
  createRemoteLinkStep,
  emitEventStep,
  useQueryGraphStep
} from '@medusajs/medusa/core-flows'
import { createWorkflow } from '@medusajs/workflows-sdk'

import { PayoutWorkflowEvents } from '@mercurjs/framework'
import { PAYOUT_MODULE } from '@mercurjs/payout'

import {
  calculatePayoutForOrderStep,
  createPayoutStep,
  validateNoExistingPayoutForOrderStep,
  validateSellerPayoutAccountStep
} from '../steps'

type ProcessPayoutForOrderWorkflowInput = {
  order_id: string
}

export const processPayoutForOrderWorkflow = createWorkflow(
  { name: 'process-payout-for-order' },
  function (input: ProcessPayoutForOrderWorkflowInput) {
    validateNoExistingPayoutForOrderStep(input.order_id)

    const { data: orders } = useQueryGraphStep({
      entity: 'order',
      fields: [
        'seller.id',
        'total',
        'currency_code',
        'payment_collections.payment_sessions.*'
      ],
      filters: {
        id: input.order_id
      },
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'query-order' })

    // @ts-ignore excessive stack depth
    const order = transform(orders, (orders: any) => {
      const transformed = orders[0]
      const paymentData = transformed.payment_collections?.[0]?.payment_sessions?.[0]?.data as { latest_charge?: string } | undefined

      return {
        seller_id: transformed.seller?.id,
        id: transformed.id,
        total: transformed.total,
        currency_code: transformed.currency_code,
        source_transaction: paymentData?.latest_charge ?? ''
      }
    })

    const sellerId = transform(order, (o) => o.seller_id)

    const { data: sellers } = useQueryGraphStep({
      entity: 'seller',
      fields: ['*', 'payout_account.*'],
      filters: {
        id: sellerId
      }
    }).config({ name: 'query-seller' })

    const seller = transform(sellers, (sellers) => sellers[0])
    const payoutAccountId = transform(seller, (s) => (s as { payout_account?: { id: string } }).payout_account?.id)

    validateSellerPayoutAccountStep(seller as any)

    const payout_total = calculatePayoutForOrderStep(input)

    const { payout, err: createPayoutErr } = createPayoutStep({
      transaction_id: order.id,
      amount: payout_total,
      currency_code: order.currency_code,
      account_id: payoutAccountId,
      source_transaction: transform(order, (o) => `${o.source_transaction ?? ''}`)
    })

    when(
      'payout-success',
      { createPayoutErr },
      ({ createPayoutErr }) => !createPayoutErr
    ).then(() => {
        createRemoteLinkStep([
          {
            [Modules.ORDER]: {
              order_id: order.id
            },
            [PAYOUT_MODULE]: {
              payout_id: payout!.id
            }
          }
        ])

        emitEventStep({
          eventName: PayoutWorkflowEvents.SUCCEEDED,
          data: {
            id: payout!.id,
            order_id: order.id
          }
        }).config({ name: 'emit-payout-succeeded' })
      }
    )

    when(
      'payout-failed',
      { createPayoutErr },
      ({ createPayoutErr }) => !!createPayoutErr
    ).then(() => {
        emitEventStep({
          eventName: PayoutWorkflowEvents.FAILED,
          data: {
            order_id: order.id
          }
        }).config({ name: 'emit-payout-failed' })
      }
    )
  }
)
