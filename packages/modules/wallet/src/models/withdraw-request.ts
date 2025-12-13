import { model } from '@medusajs/framework/utils'

export enum WithdrawRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export const WithdrawRequest = model.define('withdraw_request', {
  id: model.id({ prefix: 'wdreq' }).primaryKey(),
  wallet_id: model.text(),
  customer_id: model.text(),
  amount: model.bigNumber(),
  sheba_number: model.text(),
  status: model.enum(WithdrawRequestStatus).default(WithdrawRequestStatus.PENDING),
  rejection_reason: model.text().nullable(),
  admin_id: model.text().nullable(),
  processed_at: model.dateTime().nullable(),
}).indexes([
  {
    on: ['wallet_id'],
  },
  {
    on: ['customer_id'],
  },
])

