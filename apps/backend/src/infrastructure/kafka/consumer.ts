import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { getKafkaConfig } from './config'

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>

class KafkaConsumerService {
  private consumer: Consumer | null = null
  private kafka: Kafka | null = null
  private isConnected = false

  async startConsumer(topics: string[], handler: MessageHandler) {
    const config = getKafkaConfig()
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    })

    this.consumer = this.kafka.consumer({ 
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    })

    try {
      await this.consumer.connect()
      this.isConnected = true
      console.log('[Kafka Consumer] Connected successfully')

      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false })
        console.log(`[Kafka Consumer] Subscribed to topic: ${topic}`)
      }

      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload)
          } catch (error) {
            console.error('[Kafka Consumer] Error processing message:', error)
          }
        }
      })
    } catch (error) {
      console.error('[Kafka Consumer] Failed to start:', error)
      this.isConnected = false
      throw error
    }
  }

  async disconnect() {
    if (this.consumer && this.isConnected) {
      await this.consumer.disconnect()
      this.isConnected = false
      console.log('[Kafka Consumer] Disconnected')
    }
  }
}

export const kafkaConsumer = new KafkaConsumerService()





