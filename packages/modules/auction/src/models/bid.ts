import { model } from '@medusajs/framework/utils'

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  OUTBID = 'outbid',
}

export const Bid = model.define('bid', {
  id: model.id({ prefix: 'bid' }).primaryKey(),
  party_id: model.text(),
  customer_id: model.text(),
  amount: model.bigNumber(),
  status: model.enum(BidStatus).default(BidStatus.PENDING),
  rejection_reason: model.text().nullable(),
  processed_at: model.dateTime().nullable(),
  correlation_id: model.text().nullable(),
}).indexes([
  {
    on: ['party_id'],
  },
  {
    on: ['customer_id'],
  },
  {
    on: ['correlation_id'],
    where: 'correlation_id IS NOT NULL',
  },
])

