import { model } from '@medusajs/framework/utils'

export enum SepTransactionStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

export const SepTransaction = model.define('sep_transaction', {
  id: model.id({ prefix: 'septxn' }).primaryKey(),
  wallet_transaction_id: model.text().nullable(),
  token: model.text().unique(),
  ref_num: model.text().nullable(),
  trace_no: model.text().nullable(),
  res_num: model.text(),
  amount: model.bigNumber(),
  status: model.enum(SepTransactionStatus).default(SepTransactionStatus.PENDING),
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
    on: ['token'],
  },
  {
    on: ['ref_num'],
    where: 'ref_num IS NOT NULL',
  },
  {
    on: ['res_num'],
  },
])


