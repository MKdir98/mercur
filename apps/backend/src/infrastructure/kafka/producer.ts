import { Kafka, Producer, ProducerRecord } from 'kafkajs'
import { getKafkaConfig } from './config'

class KafkaProducerService {
  private producer: Producer | null = null
  private kafka: Kafka | null = null
  private isConnected = false

  async getProducer(): Promise<Producer> {
    if (this.producer && this.isConnected) {
      return this.producer
    }

    const config = getKafkaConfig()
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    })

    this.producer = this.kafka.producer()
    
    try {
      await this.producer.connect()
      this.isConnected = true
      console.log('[Kafka Producer] Connected successfully')
    } catch (error) {
      console.error('[Kafka Producer] Connection failed:', error)
      this.isConnected = false
      throw error
    }

    return this.producer
  }

  async sendMessage(topic: string, messages: Array<{ key?: string; value: string }>) {
    try {
      const producer = await this.getProducer()
      
      await producer.send({
        topic,
        messages
      })
    } catch (error) {
      console.error('[Kafka Producer] Failed to send message:', error)
    }
  }

  async disconnect() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect()
      this.isConnected = false
      console.log('[Kafka Producer] Disconnected')
    }
  }
}

export const kafkaProducer = new KafkaProducerService()





