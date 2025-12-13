import { model } from '@medusajs/framework/utils'

export const Wallet = model.define('wallet', {
  id: model.id({ prefix: 'wal' }).primaryKey(),
  customer_id: model.text(),
  balance: model.bigNumber().default(0),
  blocked_balance: model.bigNumber().default(0),
  currency: model.text().default('IRR'),
}).indexes([
  {
    on: ['customer_id'],
  },
])

