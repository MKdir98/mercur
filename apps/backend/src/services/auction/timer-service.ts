import { createRedisCache, RedisCache, getRedisClient } from '../../infrastructure/redis'
import { sendToKafka, KafkaTopics, UpdateMessage } from '../../infrastructure/kafka'
import { getWebSocketServer } from '../websocket/socket-server'
import { createAuctionLogger } from '../../infrastructure/elasticsearch'

const logger = createAuctionLogger()

interface PartyTimerData {
  party_id: string
  auction_id: string
  expires_at: Date
  duration_seconds: number
  last_broadcast: number
}

export class AuctionTimerService {
  private redisCache: RedisCache | null = null
  private timerInterval: NodeJS.Timeout | null = null
  private activeTimers: Map<string, PartyTimerData> = new Map()
  private isRunning: boolean = false
  private isLeader: boolean = false
  private leaderCheckInterval: NodeJS.Timeout | null = null

  constructor(private container: any) {}

  async initialize() {
    this.redisCache = await createRedisCache(process.env.REDIS_AUCTION_PREFIX || 'auction:')
    console.log('🔧 Timer Service initialized')
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Timer Service already running')
      return
    }

    if (!this.redisCache) {
      await this.initialize()
    }

    this.isRunning = true

    await this.startLeaderElection()
    await this.loadActiveParties()

    this.timerInterval = setInterval(() => this.tick(), 1000)

    console.log('🚀 Timer Service started')
  }

  private async startLeaderElection() {
    const leaderKey = 'auction:timer:leader'
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
            console.log(`🎖️  This instance (${instanceId}) became the timer leader`)
          }
        } else {
          if (this.isLeader) {
            this.isLeader = false
            console.log(`👋 This instance (${instanceId}) lost timer leader status`)
          }
        }
      } catch (error) {
        console.error('Error in timer leader election:', error)
      }
    }

    await tryBecomeLeader()
    this.leaderCheckInterval = setInterval(tryBecomeLeader, 5000)
  }

  private async loadActiveParties() {
    if (!this.isLeader) return

    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      const activeParties = await auctionModule.listAuctionPartys({ status: 'active' })

      for (const party of activeParties) {
        if (party.timer_expires_at) {
          this.activeTimers.set(party.id, {
            party_id: party.id,
            auction_id: party.auction_id,
            expires_at: new Date(party.timer_expires_at),
            duration_seconds: party.timer_duration_seconds,
            last_broadcast: 0,
          })
          console.log(`⏱️  Loaded active party timer: ${party.id}`)
        }
      }
    } catch (error) {
      console.error('Error loading active parties:', error)
    }
  }

  private async tick() {
    if (!this.isLeader) return

    const now = Date.now()

    for (const [partyId, timerData] of this.activeTimers.entries()) {
      const expiresAt = timerData.expires_at.getTime()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

      if (remaining === 0) {
        await this.handleTimerExpired(partyId, timerData)
        continue
      }

      if (now - timerData.last_broadcast >= 1000) {
        await this.broadcastTimerUpdate(partyId, timerData, remaining)
        timerData.last_broadcast = now
      }
    }
  }

  private async handleTimerExpired(partyId: string, timerData: PartyTimerData) {
    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      
      const party = await auctionModule.retrieveAuctionParty(partyId)

      if (party.current_winner_id) {
        await auctionModule.endParty(partyId, 'timeout')
      } else {
        await auctionModule.endParty(partyId, 'no_bids')
      }

      this.activeTimers.delete(partyId)

      const updateMessage: UpdateMessage = {
        event_type: 'party_ended',
        party_id: partyId,
        auction_id: timerData.auction_id,
        data: {
          winner_id: party.current_winner_id,
          final_bid: party.current_bid,
          reason: party.current_winner_id ? 'timeout' : 'no_bids',
        },
        timestamp: Date.now(),
      }

      await sendToKafka(KafkaTopics.AUCTION_UPDATES, updateMessage, partyId)

      await logger.logAuction({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Party timer expired',
        party_id: partyId,
        auction_id: timerData.auction_id,
        event_type: 'party_timer_expired',
        metadata: {
          winner_id: party.current_winner_id,
          final_bid: party.current_bid,
        },
      })

      console.log(`⏰ Timer expired for party ${partyId}`)

      await this.startNextParty(timerData.auction_id)
    } catch (error) {
      console.error(`Error handling timer expiry for party ${partyId}:`, error)
      this.activeTimers.delete(partyId)
    }
  }

  private async startNextParty(auctionId: string) {
    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      
      const nextParty = await auctionModule.startNextParty(auctionId)

      if (nextParty) {
        this.activeTimers.set(nextParty.id, {
          party_id: nextParty.id,
          auction_id: nextParty.auction_id,
          expires_at: new Date(nextParty.timer_expires_at!),
          duration_seconds: nextParty.timer_duration_seconds,
          last_broadcast: 0,
        })

        await this.redisCache!.set(`party:${nextParty.id}`, nextParty)

        const updateMessage: UpdateMessage = {
          event_type: 'party_started',
          party_id: nextParty.id,
          auction_id: nextParty.auction_id,
          data: {
            starting_price: nextParty.starting_price,
            bid_increment: nextParty.bid_increment,
            product_id: nextParty.product_id,
            timer_duration_seconds: nextParty.timer_duration_seconds,
            timer_expires_at: nextParty.timer_expires_at,
          },
          timestamp: Date.now(),
        }

        await sendToKafka(KafkaTopics.AUCTION_UPDATES, updateMessage, nextParty.id)

        await logger.logAuction({
          timestamp: new Date(),
          level: 'INFO',
          message: 'Next party started',
          party_id: nextParty.id,
          auction_id: nextParty.auction_id,
          event_type: 'party_started',
        })

        console.log(`▶️  Started next party ${nextParty.id} for auction ${auctionId}`)
      } else {
        console.log(`🏁 Auction ${auctionId} has ended - no more parties`)
      }
    } catch (error) {
      console.error(`Error starting next party for auction ${auctionId}:`, error)
    }
  }

  private async broadcastTimerUpdate(partyId: string, timerData: PartyTimerData, remaining: number) {
    const wsServer = getWebSocketServer()
    
    if (wsServer) {
      wsServer.broadcastTimerUpdate(partyId, {
        party_id: partyId,
        remaining_seconds: remaining,
        expires_at: timerData.expires_at.toISOString(),
      })
    }
  }

  async resetTimer(partyId: string) {
    try {
      const auctionModule = this.container.resolve('auctionModuleService')
      
      const updatedParty = await auctionModule.resetPartyTimer(partyId)

      if (this.activeTimers.has(partyId)) {
        const timerData = this.activeTimers.get(partyId)!
        timerData.expires_at = new Date(updatedParty.timer_expires_at!)
        timerData.last_broadcast = 0
      }

      await this.redisCache!.set(`party:${partyId}`, updatedParty)

      const updateMessage: UpdateMessage = {
        event_type: 'timer_reset',
        party_id: partyId,
        auction_id: updatedParty.auction_id,
        data: {
          expires_at: updatedParty.timer_expires_at,
          duration_seconds: updatedParty.timer_duration_seconds,
        },
        timestamp: Date.now(),
      }

      await sendToKafka(KafkaTopics.AUCTION_UPDATES, updateMessage, partyId)

      await logger.logAuction({
        timestamp: new Date(),
        level: 'INFO',
        message: 'Party timer reset',
        party_id: partyId,
        event_type: 'timer_reset',
      })

      console.log(`🔄 Timer reset for party ${partyId}`)
    } catch (error) {
      console.error(`Error resetting timer for party ${partyId}:`, error)
    }
  }

  async addPartyTimer(partyId: string, auctionId: string, expiresAt: Date, durationSeconds: number) {
    this.activeTimers.set(partyId, {
      party_id: partyId,
      auction_id: auctionId,
      expires_at: expiresAt,
      duration_seconds: durationSeconds,
      last_broadcast: 0,
    })

    console.log(`➕ Added timer for party ${partyId}`)
  }

  async removePartyTimer(partyId: string) {
    this.activeTimers.delete(partyId)
    console.log(`➖ Removed timer for party ${partyId}`)
  }

  async stop() {
    this.isRunning = false
    this.isLeader = false

    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval)
      this.leaderCheckInterval = null
    }

    this.activeTimers.clear()

    console.log('🛑 Timer Service stopped')
  }
}

let timerService: AuctionTimerService | null = null

export function createTimerService(container: any): AuctionTimerService {
  if (!timerService) {
    timerService = new AuctionTimerService(container)
  }
  return timerService
}

export function getTimerService(): AuctionTimerService | null {
  return timerService
}



