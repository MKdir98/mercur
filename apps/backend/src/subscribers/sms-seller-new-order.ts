import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  OrderWorkflowEvents
} from '@medusajs/framework/utils'

import { createSmsService } from '../lib/sms/sms-ir.service'

export default async function smsSellerNewOrderHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const templateId = process.env.SMS_IR_ORDER_SUBMIT_SELLER_TEMPLATE_ID
  if (!templateId) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: ['id', 'display_id', 'seller.phone'],
    filters: { id: event.data.id }
  })

  const phone = order?.seller?.phone
  if (!phone) return

  const smsService = createSmsService()
  const result = await smsService.sendTemplate(phone, templateId, {
    order_id: String(
      (order as { display_id?: number }).display_id ?? order.id
    )
  })

  if (!result.success) {
    console.error(
      `❌ [SMS] Failed to send new order notification to seller ${phone}:`,
      result.error
    )
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
  context: {
    subscriberId: 'sms-seller-new-order-handler'
  }
}
