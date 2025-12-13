import { createKafkaConsumer, KafkaTopics, UpdateMessage } from '../../infrastructure/kafka'
import { getWebSocketServer } from '../websocket/socket-server'
import { Consumer } from 'kafkajs'

export class UpdateBroadcasterService {
  private consumer: Consumer | null = null
  private isRunning: boolean = false

  async initialize() {
    const groupId = `${process.env.KAFKA_GROUP_ID || 'auction-consumer'}-updates-${process.pid}`
    this.consumer = createKafkaConsumer(groupId)
    
    console.log('🔧 Update Broadcaster initialized')
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Update Broadcaster already running')
      return
    }

    if (!this.consumer) {
      await this.initialize()
    }

    await this.consumer!.connect()
    await this.consumer!.subscribe({ topic: KafkaTopics.AUCTION_UPDATES, fromBeginning: false })

    this.isRunning = true

    await this.consumer!.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const updateData: UpdateMessage = JSON.parse(message.value!.toString())
          await this.broadcastUpdate(updateData)
        } catch (error) {
          console.error('Error broadcasting update:', error)
        }
      },
    })

    console.log('🚀 Update Broadcaster started and listening...')
  }

  private async broadcastUpdate(update: UpdateMessage) {
    const wsServer = getWebSocketServer()
    
    if (!wsServer) {
      console.warn('⚠️  WebSocket server not initialized, cannot broadcast')
      return
    }

    const { event_type, party_id, auction_id, data } = update

    switch (event_type) {
      case 'bid_accepted':
        wsServer.broadcastBidUpdate(party_id, {
          event: 'bid_accepted',
          current_bid: data.current_bid,
          current_winner_id: data.current_winner_id,
          previous_winner_id: data.previous_winner_id,
        })
        break

      case 'bid_rejected':
        if (data.customer_id) {
          wsServer.sendErrorToClient(data.customer_id, {
            message: data.reason || 'Bid rejected',
            party_id,
          })
        }
        break

      case 'party_started':
        wsServer.broadcastPartyStarted(party_id, auction_id, {
          event: 'party_started',
          party_id,
          auction_id,
          ...data,
        })
        break

      case 'party_ended':
        wsServer.broadcastPartyEnded(party_id, auction_id, {
          event: 'party_ended',
          party_id,
          auction_id,
          winner_id: data.winner_id,
          final_bid: data.final_bid,
          reason: data.reason,
        })
        break

      case 'timer_reset':
        wsServer.broadcastTimerUpdate(party_id, {
          event: 'timer_reset',
          expires_at: data.expires_at,
          duration_seconds: data.duration_seconds,
        })
        break

      default:
        console.warn(`Unknown update event type: ${event_type}`)
    }

    console.log(`📡 Broadcasted ${event_type} for party ${party_id}`)
  }

  async stop() {
    this.isRunning = false

    if (this.consumer) {
      await this.consumer.disconnect()
      this.consumer = null
    }

    console.log('🛑 Update Broadcaster stopped')
  }
}

let updateBroadcasterService: UpdateBroadcasterService | null = null

export function createUpdateBroadcaster(): UpdateBroadcasterService {
  if (!updateBroadcasterService) {
    updateBroadcasterService = new UpdateBroadcasterService()
  }
  return updateBroadcasterService
}

export function getUpdateBroadcaster(): UpdateBroadcasterService | null {
  return updateBroadcasterService
}



