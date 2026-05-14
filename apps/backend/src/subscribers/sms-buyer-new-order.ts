import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  OrderWorkflowEvents
} from '@medusajs/framework/utils'

import { createSmsService } from '../lib/sms/sms-ir.service'

export default async function smsBuyerNewOrderHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const templateId = process.env.SMS_IR_ORDER_SUBMIT_BUYER_TEMPLATE_ID
  if (!templateId) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order]
  } = await query.graph({
    entity: 'order',
    fields: ['id', 'display_id', 'customer.phone'],
    filters: { id: event.data.id }
  })

  const phone = order?.customer?.phone
  if (!phone) return

  const smsService = createSmsService()
  const result = await smsService.sendTemplate(phone, templateId, {
    order_id: String(
      (order as { display_id?: number }).display_id ?? order.id
    )
  })

  if (!result.success) {
    console.error(
      `❌ [SMS] Failed to send order confirmation to buyer ${phone}:`,
      result.error
    )
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
  context: {
    subscriberId: 'sms-buyer-new-order-handler'
  }
}
