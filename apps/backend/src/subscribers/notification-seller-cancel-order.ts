import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { ResendNotificationTemplates } from '@mercurjs/resend'

import { Hosts, buildHostAddress } from '../shared/infra/http/utils'
import { orderCode } from '../shared/utils'

export default async function sellerCancelOrderHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: [
      'id',
      'email',
      'display_id',
      'items.*',
      'customer.first_name',
      'customer.last_name',
      'seller.*'
    ],
    filters: {
      id: event.data.id
    }
  })

  if (!order) {
    console.error('Order not found:', event.data.id)
    return
  }

  const sellerEmail = order.seller?.email
  if (!sellerEmail) return
  await notificationService.createNotifications([
    {
      to: sellerEmail,
      channel: 'email',
      template: ResendNotificationTemplates.SELLER_CANCELED_ORDER,
      content: {
        subject: `Your order ${(() => {
          const d = (order as { display_id?: number }).display_id
          return d ? orderCode(d) : order.id
        })()} has been canceled`
      },
      data: {
        data: {
          order: {
            id: order.id,
            display_id: (() => {
              const d = (order as { display_id?: number }).display_id
              return d ? orderCode(d) : order.id
            })(),
            item: order.items
          },
          order_address: buildHostAddress(
            Hosts.VENDOR_PANEL,
            `/orders/${order.id}`
          ).toString()
        }
      }
    }
  ])
}

export const config: SubscriberConfig = {
  event: 'order.canceled',
  context: {
    subscriberId: 'notification-seller-cancel-order'
  }
}
