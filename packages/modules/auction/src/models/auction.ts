import { model } from '@medusajs/framework/utils'

export enum AuctionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export const Auction = model.define('auction', {
  id: model.id({ prefix: 'auc' }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  start_date: model.dateTime(),
  end_date: model.dateTime().nullable(),
  status: model.enum(AuctionStatus).default(AuctionStatus.DRAFT),
  is_enabled: model.boolean().default(false),
  party_registration_cutoff_hours: model.number().default(2),
  metadata: model.json().nullable(),
})

