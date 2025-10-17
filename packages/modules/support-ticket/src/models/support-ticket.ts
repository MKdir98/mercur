import { model } from '@medusajs/framework/utils'

export const SupportTicket = model.define('support_ticket', {
  id: model.id({ prefix: 'stk' }).primaryKey(),
  name: model.text(),
  email: model.text(),
  phone: model.text().nullable(),
  type: model.enum(['support', 'complaint', 'partnership', 'suggestion']),
  subject: model.text(),
  message: model.text(),
  status: model.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  admin_notes: model.text().nullable()
})

