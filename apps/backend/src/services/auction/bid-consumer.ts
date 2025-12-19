import { createKafkaConsumer, KafkaTopics, BidMessage, UpdateMessage, sendToKafka } from '../../infrastructure/kafka'
import { createRedisCache, RedisCache, getRedisClient } from '../../infrastructure/redis'
import { createAuctionLogger, LogLevel } from '../../infrastructure/elasticsearch'
import { Consumer } from 'kafkajs'

const logger = createAuctionLogger()

export class BidConsumerService {
  private consumer: Consumer | null = null
  private redisCache: RedisCache | null = null
  private isLeader: boolean = false
  private isRunning: boolean = false
  private leaderCheckInterval: NodeJS.Timeout | null = null

  constructor(private container: any) {}

  async initialize() {
    const groupId = process.env.KAFKA_GROUP_ID || 'auction-consumer'
    this.consumer = createKafkaConsumer(groupId)
    this.redisCache = await createRedisCache(process.env.REDIS_AUCTION_PREFIX || 'auction:')
    
    console.log('🔧 Bid Consumer initialized')
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Bid Consumer already running')
      return
    }

    if (!this.consumer || !this.redisCache) {
      await this.initialize()
    }

    await this.consumer!.connect()
    await this.consumer!.subscribe({ topic: KafkaTopics.AUCTION_BIDS, fromBeginning: false })

    this.isRunning = true
    await this.startLeaderElection()

    await this.consumer!.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!this.isLeader) {
          return
        }

        try {
          const bidData: BidMessage = JSON.parse(message.value!.toString())
          await this.processBid(bidData)
        } catch (error) {
          console.error('Error processing bid message:', error)
          await logger.logAuction({
            timestamp: new Date(),
            level: 'ERROR',
            message: 'Error processing bid message',
            event_type: 'bid_process_error',
            metadata: { error: error instanceof Error ? error.message : String(error) },
          })
        }
      },
    })

    console.log('🚀 Bid Consumer started and listening...')
  }

  private async startLeaderElection() {
    const leaderKey = 'auction:consumer:leader'
    const leaderTtl = 10
    const instanceId = `${process.env.HOSTNAME || 'localhost'}-${process.pid}`

    const tryBecomeLeader = async () => {
      try {
        const redis = await getRedisClient()
        const currentLeader = await redis.get(leaderKey)

        if (!currentLeader || currentLeader === instanceId) {
          await redis.setEx(leaderKey, leaderTtl, instanceId)
          
          if (!this.isLeader) {
            this.isLeader = true
            console.log(`🎖️  This instance (${instanceId}) became the leader`)
            await logger.logAuction({
              timestamp: new Date(),
              level: 'INFO',
              message: 'Instance became consumer leader',
              event_type: 'leader_elected',
              metadata: { instanceId },
            })
          }
        } else {
          if (this.isLeader) {
            this.isLeader = false
            console.log(`👋 This instance (${instanceId}) lost leader status`)
            await logger.logAuction({
              timestamp: new Date(),
              level: 'INFO',
              message: 'Instance lost consumer leader status',
              event_type: 'leader_lost',
              metadata: { instanceId, newLeader: currentLeader },
            })
          }
        }
      } catch (error) {
        console.error('Error in leader election:', error)
      }
    }

    await tryBecomeLeader()
    this.leaderCheckInterval = setInterval(tryBecomeLeader, 5000)
  }

  private async processBid(bidData: BidMessage) {
    const { party_id, customer_id, bid_amount, correlation_id } = bidData
    const startTime = Date.now()

    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      const walletModule = this.container.resolve('walletModuleService')

      const party = await auctionModule.retrieveAuctionParty(party_id)

      if (!party || party.status !== 'active') {
        await this.rejectBid(party_id, customer_id, bid_amount, correlation_id, 'Party is not active')
        return
      }

      const currentBidPrice = party.current_bid || party.starting_price
      const minBidRequired = Number(currentBidPrice) + Number(party.bid_increment)

      if (bid_amount < minBidRequired) {
        await this.rejectBid(
          party_id,
          customer_id,
          bid_amount,
          correlation_id,
          `Bid must be at least ${minBidRequired}`
        )
        return
      }

      if (party.current_winner_id === customer_id) {
        await this.rejectBid(party_id, customer_id, bid_amount, correlation_id, 'Already highest bidder')
        return
      }

      const customerWallet = await walletModule.getWalletByCustomerId(customer_id)
      if (!customerWallet) {
        await this.rejectBid(party_id, customer_id, bid_amount, correlation_id, 'Wallet not found')
        return
      }

      const blockAmount = (bid_amount * 20) / 100
      const availableBalance = await walletModule.getAvailableBalance(customerWallet.id)

      if (availableBalance < blockAmount) {
        await this.rejectBid(party_id, customer_id, bid_amount, correlation_id, 'Insufficient balance')
        return
      }

      const previousWinnerId = party.current_winner_id

      if (previousWinnerId) {
        const previousWallet = await walletModule.getWalletByCustomerId(previousWinnerId)
        if (previousWallet) {
          const previousBlockAmount = (Number(party.current_bid) * 20) / 100
          await walletModule.unblockAmount(
            previousWallet.id,
            previousBlockAmount,
            `party:${party_id}:bid:${party.current_bid}`
          )

          await this.redisCache!.set(
            `wallet:balance:${previousWinnerId}`,
            await walletModule.getAvailableBalance(previousWallet.id)
          )
        }
      }

      await walletModule.blockAmount(
        customerWallet.id,
        blockAmount,
        `party:${party_id}:bid:${bid_amount}`
      )

      await auctionModule.updatePartyBid(party_id, customer_id, bid_amount)

      await auctionModule.createBidRecord({
        party_id,
        customer_id,
        amount: bid_amount,
        correlation_id,
      })

      await auctionModule.acceptBid(
        (await auctionModule.listBids({ correlation_id }))[0].id
      )

      const updatedParty = await auctionModule.retrieveAuctionParty(party_id)
      await this.redisCache!.set(`party:${party_id}`, updatedParty)
      await this.redisCache!.set(
        `wallet:balance:${customer_id}`,
        await walletModule.getAvailableBalance(customerWallet.id)
      )

      const updateMessage: UpdateMessage = {
        event_type: 'bid_accepted',
        party_id,
        auction_id: party.auction_id,
        data: {
          current_bid: bid_amount,
          current_winner_id: customer_id,
          previous_winner_id: previousWinnerId,
        },
        timestamp: Date.now(),
        correlation_id,
      }

      await sendToKafka(KafkaTopics.AUCTION_UPDATES, updateMessage, party_id)

      await logger.logAuction({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Bid accepted and processed',
        party_id,
        customer_id,
        bid_amount,
        bid_status: 'accepted',
        event_type: 'bid_accepted',
        correlation_id,
        processing_time_ms: Date.now() - startTime,
        metadata: { previous_winner_id: previousWinnerId },
      })

      console.log(`✅ Bid processed: ${bid_amount} for party ${party_id} by customer ${customer_id}`)
    } catch (error: any) {
      await this.rejectBid(
        party_id,
        customer_id,
        bid_amount,
        correlation_id,
        `Processing error: ${error.message}`
      )

      await logger.logAuction({
        timestamp: new Date(),
        level: 'ERROR',
        message: 'Bid processing failed',
        party_id,
        customer_id,
        bid_amount,
        bid_status: 'rejected',
        event_type: 'bid_rejected',
        correlation_id,
        processing_time_ms: Date.now() - startTime,
        metadata: { error: error.message, stack: error.stack },
      })
    }
  }

  private async rejectBid(
    partyId: string,
    customerId: string,
    bidAmount: number,
    correlationId: string | null,
    reason: string
  ) {
    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      const party = await auctionModule.retrieveAuctionParty(partyId)

      await auctionModule.createBidRecord({
        party_id: partyId,
        customer_id: customerId,
        amount: bidAmount,
        correlation_id: correlationId || undefined,
      })

      const bids = await auctionModule.listBids({ correlation_id: correlationId || undefined })
      if (bids.length > 0) {
        await auctionModule.rejectBid(bids[0].id, reason)
      }

      const updateMessage: UpdateMessage = {
        event_type: 'bid_rejected',
        party_id: partyId,
        auction_id: party.auction_id,
        data: {
          customer_id: customerId,
          bid_amount: bidAmount,
          reason,
        },
        timestamp: Date.now(),
        correlation_id: correlationId || undefined,
      }

      await sendToKafka(KafkaTopics.AUCTION_UPDATES, updateMessage, partyId)

      await logger.logAuction({
        timestamp: new Date(),
        level: 'WARN',
        message: 'Bid rejected',
        party_id: partyId,
        customer_id: customerId,
        bid_amount: bidAmount,
        bid_status: 'rejected',
        event_type: 'bid_rejected',
        correlation_id: correlationId || undefined,
        metadata: { reason },
      })

      console.log(`❌ Bid rejected: ${bidAmount} for party ${partyId} - ${reason}`)
    } catch (error) {
      console.error('Error rejecting bid:', error)
    }
  }

  async stop() {
    this.isRunning = false
    this.isLeader = false

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval)
      this.leaderCheckInterval = null
    }

    if (this.consumer) {
      await this.consumer.disconnect()
      this.consumer = null
    }

    console.log('🛑 Bid Consumer stopped')
  }
}

let bidConsumerService: BidConsumerService | null = null

export function createBidConsumer(container: any): BidConsumerService {
  if (!bidConsumerService) {
    bidConsumerService = new BidConsumerService(container)
  }
  return bidConsumerService
}

export function getBidConsumer(): BidConsumerService | null {
  return bidConsumerService
}






