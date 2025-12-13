import { model } from '@medusajs/framework/utils'

export enum AuctionPartyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export const AuctionParty = model.define('auction_party', {
  id: model.id({ prefix: 'aucpar' }).primaryKey(),
  auction_id: model.text(),
  product_id: model.text(),
  seller_id: model.text(),
  starting_price: model.bigNumber(),
  bid_increment: model.bigNumber(),
  current_bid: model.bigNumber().nullable(),
  current_winner_id: model.text().nullable(),
  status: model.enum(AuctionPartyStatus).default(AuctionPartyStatus.PENDING),
  position: model.number(),
  timer_duration_seconds: model.number().default(600),
  timer_expires_at: model.dateTime().nullable(),
  started_at: model.dateTime().nullable(),
  ended_at: model.dateTime().nullable(),
}).indexes([
  {
    on: ['auction_id'],
  },
  {
    on: ['product_id'],
  },
  {
    on: ['seller_id'],
  },
  {
    on: ['current_winner_id'],
    where: 'current_winner_id IS NOT NULL',
  },
])

