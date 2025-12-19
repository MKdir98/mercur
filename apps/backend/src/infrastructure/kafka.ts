import { Kafka, Producer, Consumer, Admin, logLevel } from 'kafkajs'

let kafka: Kafka | null = null
let producer: Producer | null = null
let admin: Admin | null = null

export function getKafka(): Kafka {
  if (kafka) {
    return kafka
  }

  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'mercur-backend',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '3000'),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
    logLevel: logLevel.INFO,
  })

  return kafka
}

export async function getKafkaProducer(): Promise<Producer> {
  if (producer && producer.events) {
    return producer
  }

  const kafka = getKafka()
  producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionalId: undefined,
    maxInFlightRequests: 5,
    idempotent: true,
  })

  await producer.connect()

  producer.on('producer.connect', () => {
    console.log('Kafka Producer Connected')
  })

  producer.on('producer.disconnect', () => {
    console.log('Kafka Producer Disconnected')
  })

  return producer
}

export async function closeKafkaProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    producer = null
  }
}

export async function getKafkaAdmin(): Promise<Admin> {
  if (admin) {
    return admin
  }

  const kafka = getKafka()
  admin = kafka.admin()
  await admin.connect()

  return admin
}

export async function closeKafkaAdmin(): Promise<void> {
  if (admin) {
    await admin.disconnect()
    admin = null
  }
}

export function createKafkaConsumer(groupId: string): Consumer {
  const kafka = getKafka()
  return kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytes: 10485760,
    retry: {
      retries: 5,
    },
  })
}

export interface BidMessage {
  party_id: string
  customer_id: string
  bid_amount: number
  timestamp: number
  correlation_id: string
}

export interface UpdateMessage {
  event_type: 'bid_accepted' | 'bid_rejected' | 'party_ended' | 'party_started' | 'timer_reset'
  party_id: string
  auction_id: string
  data: any
  timestamp: number
  correlation_id?: string
}

export interface WalletTransactionMessage {
  wallet_id: string
  customer_id: string
  transaction_type: 'deposit' | 'withdraw' | 'block' | 'unblock'
  amount: number
  reference_id?: string
  metadata?: Record<string, any>
  timestamp: number
  correlation_id: string
}

export const KafkaTopics = {
  AUCTION_BIDS: 'auction.bids',
  AUCTION_UPDATES: 'auction.updates',
  WALLET_TRANSACTIONS: 'wallet.transactions',
} as const

export async function sendToKafka<T>(topic: string, message: T, key?: string): Promise<void> {
  const producer = await getKafkaProducer()
  
  await producer.send({
    topic,
    messages: [
      {
        key: key || undefined,
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
      },
    ],
  })
}






