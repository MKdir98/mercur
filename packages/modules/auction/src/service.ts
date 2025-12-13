import { MedusaService } from '@medusajs/framework/utils'
import { Auction, AuctionStatus } from './models/auction'
import { AuctionParty, AuctionPartyStatus } from './models/auction-party'
import { Bid, BidStatus } from './models/bid'

class AuctionModuleService extends MedusaService({
  Auction,
  AuctionParty,
  Bid,
}) {
  async createAuctionWithDetails(data: {
    title: string
    description?: string
    start_date: Date
    party_registration_cutoff_hours?: number
    is_enabled?: boolean
  }) {
    return await this.createAuctions({
      title: data.title,
      description: data.description,
      start_date: data.start_date,
      status: AuctionStatus.DRAFT,
      is_enabled: data.is_enabled ?? false,
      party_registration_cutoff_hours: data.party_registration_cutoff_hours ?? 2,
    })
  }

  async createPartyForAuction(data: {
    auction_id: string
    product_id: string
    seller_id: string
    starting_price: number
    bid_increment_percentage?: number
  }) {
    const auction = await this.retrieveAuction(data.auction_id)

    if (auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.ENDED) {
      throw new Error('Cannot add party to an active or ended auction')
    }

    const cutoffTime = new Date(auction.start_date)
    cutoffTime.setHours(cutoffTime.getHours() - auction.party_registration_cutoff_hours)

    if (new Date() > cutoffTime) {
      throw new Error('Party registration cutoff time has passed')
    }

    const existingParties = await this.listAuctionParties({ auction_id: data.auction_id })
    const position = existingParties.length + 1

    const bidIncrementPercentage = data.bid_increment_percentage ?? 20
    const bidIncrement = (data.starting_price * bidIncrementPercentage) / 100

    return await this.createAuctionParties({
      auction_id: data.auction_id,
      product_id: data.product_id,
      seller_id: data.seller_id,
      starting_price: data.starting_price,
      bid_increment: bidIncrement,
      position,
      status: AuctionPartyStatus.PENDING,
    })
  }

  async getActivePartyForAuction(auctionId: string) {
    const parties = await this.listAuctionParties({
      auction_id: auctionId,
      status: AuctionPartyStatus.ACTIVE,
    })

    return parties.length > 0 ? parties[0] : null
  }

  async startNextParty(auctionId: string) {
    const currentActive = await this.getActivePartyForAuction(auctionId)
    
    if (currentActive) {
      await this.endParty(currentActive.id, 'timeout')
    }

    const pendingParties = await this.listAuctionParties(
      { auction_id: auctionId, status: AuctionPartyStatus.PENDING },
      { order: { position: 'ASC' } }
    )

    if (pendingParties.length === 0) {
      await this.updateAuctions({
        id: auctionId,
        status: AuctionStatus.ENDED,
        end_date: new Date(),
      })
      return null
    }

    const nextParty = pendingParties[0]
    const timerExpiresAt = new Date()
    timerExpiresAt.setSeconds(timerExpiresAt.getSeconds() + nextParty.timer_duration_seconds)

    await this.updateAuctionParties({
      id: nextParty.id,
      status: AuctionPartyStatus.ACTIVE,
      started_at: new Date(),
      timer_expires_at: timerExpiresAt,
    })

    return await this.retrieveAuctionParty(nextParty.id)
  }

  async endParty(partyId: string, reason: 'timeout' | 'no_bids' | 'cancelled') {
    let status = AuctionPartyStatus.COMPLETED
    if (reason === 'no_bids') {
      status = AuctionPartyStatus.FAILED
    } else if (reason === 'cancelled') {
      status = AuctionPartyStatus.CANCELLED
    }

    await this.updateAuctionParties({
      id: partyId,
      status,
      ended_at: new Date(),
      timer_expires_at: null,
    })

    return await this.retrieveAuctionParty(partyId)
  }

  async resetPartyTimer(partyId: string) {
    const party = await this.retrieveAuctionParty(partyId)
    
    const newExpiresAt = new Date()
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + party.timer_duration_seconds)

    await this.updateAuctionParties({
      id: partyId,
      timer_expires_at: newExpiresAt,
    })

    return await this.retrieveAuctionParty(partyId)
  }

  async updatePartyBid(partyId: string, customerId: string, amount: number) {
    await this.updateAuctionParties({
      id: partyId,
      current_bid: amount,
      current_winner_id: customerId,
    })

    return await this.retrieveAuctionParty(partyId)
  }

  async createBidRecord(data: {
    party_id: string
    customer_id: string
    amount: number
    correlation_id?: string
  }) {
    return await this.createBids({
      party_id: data.party_id,
      customer_id: data.customer_id,
      amount: data.amount,
      status: BidStatus.PENDING,
      correlation_id: data.correlation_id,
    })
  }

  async acceptBid(bidId: string) {
    await this.updateBids({
      id: bidId,
      status: BidStatus.ACCEPTED,
      processed_at: new Date(),
    })

    return await this.retrieveBid(bidId)
  }

  async rejectBid(bidId: string, reason: string) {
    await this.updateBids({
      id: bidId,
      status: BidStatus.REJECTED,
      rejection_reason: reason,
      processed_at: new Date(),
    })

    return await this.retrieveBid(bidId)
  }

  async markBidAsOutbid(bidId: string) {
    await this.updateBids({
      id: bidId,
      status: BidStatus.OUTBID,
    })

    return await this.retrieveBid(bidId)
  }

  async getPartiesBySeller(sellerId: string) {
    return await this.listAuctionParties({ seller_id: sellerId })
  }

  async cancelParty(partyId: string) {
    const party = await this.retrieveAuctionParty(partyId)

    if (party.status === AuctionPartyStatus.ACTIVE) {
      throw new Error('Cannot cancel an active party')
    }

    if (party.status === AuctionPartyStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed party')
    }

    await this.updateAuctionParties({
      id: partyId,
      status: AuctionPartyStatus.CANCELLED,
      ended_at: new Date(),
    })

    return await this.retrieveAuctionParty(partyId)
  }

  async getBidsForParty(partyId: string) {
    return await this.listBids(
      { party_id: partyId },
      { order: { created_at: 'DESC' } }
    )
  }

  async getWinningBidsForCustomer(customerId: string) {
    const parties = await this.listAuctionParties({ current_winner_id: customerId })
    return parties.filter(p => 
      p.status === AuctionPartyStatus.COMPLETED || 
      p.status === AuctionPartyStatus.ACTIVE
    )
  }
}

export default AuctionModuleService

