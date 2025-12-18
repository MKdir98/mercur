import { createRedisCache, RedisCache } from '../../infrastructure/redis'
import { sendToKafka, KafkaTopics, BidMessage } from '../../infrastructure/kafka'
import { createAuctionLogger, LogLevel } from '../../infrastructure/elasticsearch'
import { v4 as uuidv4 } from 'uuid'

const logger = createAuctionLogger()

export interface BidValidationResult {
  valid: boolean
  reason?: string
}

export interface ProduceBidResult {
  success: boolean
  correlationId: string
  message: string
  error?: string
}

export class BidProducerService {
  private redisCache: RedisCache | null = null

  async initialize() {
    this.redisCache = await createRedisCache(process.env.REDIS_AUCTION_PREFIX || 'auction:')
  }

  private async getRedisCache(): Promise<RedisCache> {
    if (!this.redisCache) {
      await this.initialize()
    }
    return this.redisCache!
  }

  async validateBidInitial(
    partyId: string,
    customerId: string,
    bidAmount: number
  ): Promise<BidValidationResult> {
    const redis = await this.getRedisCache()

    const [partyData, customerBalance] = await Promise.all([
      redis.get<any>(`party:${partyId}`),
      redis.get<number>(`wallet:balance:${customerId}`),
    ])

    if (!partyData) {
      return {
        valid: false,
        reason: 'Party not found or not active',
      }
    }

    if (partyData.status !== 'active') {
      return {
        valid: false,
        reason: 'Party is not active',
      }
    }

    const currentBidPrice = partyData.current_bid || partyData.starting_price
    const minBidRequired = currentBidPrice + partyData.bid_increment

    if (bidAmount < minBidRequired) {
      return {
        valid: false,
        reason: `Bid must be at least ${minBidRequired}`,
      }
    }

    if (partyData.current_winner_id === customerId) {
      return {
        valid: false,
        reason: 'You are already the highest bidder',
      }
    }

    const blockedAmount = (bidAmount * 20) / 100

    if (!customerBalance || customerBalance < blockedAmount) {
      return {
        valid: false,
        reason: 'Insufficient wallet balance',
      }
    }

    const timerExpiresAt = partyData.timer_expires_at
    if (timerExpiresAt && new Date(timerExpiresAt) < new Date()) {
      return {
        valid: false,
        reason: 'Party time has expired',
      }
    }

    return { valid: true }
  }

  async produceBid(
    partyId: string,
    customerId: string,
    bidAmount: number
  ): Promise<ProduceBidResult> {
    const correlationId = uuidv4()
    const startTime = Date.now()

    try {
      const validation = await this.validateBidInitial(partyId, customerId, bidAmount)

      if (!validation.valid) {
        await logger.logAuction({
          timestamp: new Date(),
          level: 'WARN',
          message: 'Bid validation failed',
          party_id: partyId,
          customer_id: customerId,
          bid_amount: bidAmount,
          event_type: 'bid_validation_failed',
          correlation_id: correlationId,
          processing_time_ms: Date.now() - startTime,
          metadata: { reason: validation.reason },
        })

        return {
          success: false,
          correlationId,
          message: validation.reason || 'Validation failed',
        }
      }

      const bidMessage: BidMessage = {
        party_id: partyId,
        customer_id: customerId,
        bid_amount: bidAmount,
        timestamp: Date.now(),
        correlation_id: correlationId,
      }

      await sendToKafka(KafkaTopics.AUCTION_BIDS, bidMessage, partyId)

      await logger.logAuction({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Bid produced to Kafka',
        party_id: partyId,
        customer_id: customerId,
        bid_amount: bidAmount,
        event_type: 'bid_produced',
        correlation_id: correlationId,
        processing_time_ms: Date.now() - startTime,
      })

      return {
        success: true,
        correlationId,
        message: 'Bid submitted successfully',
      }
    } catch (error: any) {
      await logger.logAuction({
        timestamp: new Date(),
        level: 'ERROR',
        message: 'Failed to produce bid',
        party_id: partyId,
        customer_id: customerId,
        bid_amount: bidAmount,
        event_type: 'bid_produce_error',
        correlation_id: correlationId,
        processing_time_ms: Date.now() - startTime,
        metadata: { error: error.message, stack: error.stack },
      })

      return {
        success: false,
        correlationId,
        message: 'Failed to submit bid',
        error: error.message,
      }
    }
  }

  async updatePartyCache(partyId: string, partyData: any) {
    const redis = await this.getRedisCache()
    const ttl = parseInt(process.env.REDIS_CACHE_TTL || '300')
    await redis.set(`party:${partyId}`, partyData, ttl)
  }

  async updateWalletBalanceCache(customerId: string, balance: number) {
    const redis = await this.getRedisCache()
    const ttl = parseInt(process.env.REDIS_CACHE_TTL || '300')
    await redis.set(`wallet:balance:${customerId}`, balance, ttl)
  }

  async invalidatePartyCache(partyId: string) {
    const redis = await this.getRedisCache()
    await redis.del(`party:${partyId}`)
  }
}

let bidProducerService: BidProducerService | null = null

export async function getBidProducerService(): Promise<BidProducerService> {
  if (!bidProducerService) {
    bidProducerService = new BidProducerService()
    await bidProducerService.initialize()
  }
  return bidProducerService
}





