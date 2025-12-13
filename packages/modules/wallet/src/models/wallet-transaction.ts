import { model } from '@medusajs/framework/utils'

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  BLOCK = 'block',
  UNBLOCK = 'unblock',
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const WalletTransaction = model.define('wallet_transaction', {
  id: model.id({ prefix: 'waltxn' }).primaryKey(),
  wallet_id: model.text(),
  type: model.enum(WalletTransactionType),
  amount: model.bigNumber(),
  status: model.enum(WalletTransactionStatus).default(WalletTransactionStatus.PENDING),
  reference_id: model.text().nullable(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
}).indexes([
  {
    on: ['wallet_id'],
  },
  {
    on: ['reference_id'],
    where: 'reference_id IS NOT NULL',
  },
])

