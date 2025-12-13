import { model } from '@medusajs/framework/utils'

export enum ZarinpalTransactionStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const ZarinpalTransaction = model.define('zarinpal_transaction', {
  id: model.id({ prefix: 'zartxn' }).primaryKey(),
  wallet_transaction_id: model.text().nullable(),
  authority: model.text().unique(),
  ref_id: model.text().nullable(),
  amount: model.bigNumber(),
  status: model.enum(ZarinpalTransactionStatus).default(ZarinpalTransactionStatus.PENDING),
  callback_url: model.text(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
  verified_at: model.dateTime().nullable(),
}).indexes([
  {
    on: ['wallet_transaction_id'],
    where: 'wallet_transaction_id IS NOT NULL',
  },
  {
    on: ['authority'],
  },
  {
    on: ['ref_id'],
    where: 'ref_id IS NOT NULL',
  },
])

