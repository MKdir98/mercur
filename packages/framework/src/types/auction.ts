export enum AuctionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export interface Auction {
  id: string
  title: string
  description: string | null
  start_date: Date
  end_date: Date | null
  status: AuctionStatus
  is_enabled: boolean
  party_registration_cutoff_hours: number
  metadata: Record<string, any> | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export enum AuctionPartyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export interface AuctionParty {
  id: string
  auction_id: string
  product_id: string
  seller_id: string
  starting_price: number
  bid_increment: number
  current_bid: number | null
  current_winner_id: string | null
  status: AuctionPartyStatus
  position: number
  timer_duration_seconds: number
  timer_expires_at: Date | null
  started_at: Date | null
  ended_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  OUTBID = 'outbid',
}

export interface Bid {
  id: string
  party_id: string
  customer_id: string
  amount: number
  status: BidStatus
  rejection_reason: string | null
  processed_at: Date | null
  correlation_id: string | null
  created_at: Date
}






