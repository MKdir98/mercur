import { Kafka, Admin } from 'kafkajs'

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'mercur-backend',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 3000,
  requestTimeout: 30000,
})

const topicsConfig = [
  {
    topic: 'auction.bids',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '604800000' },
      { name: 'compression.type', value: 'snappy' },
    ],
  },
  {
    topic: 'auction.updates',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '86400000' },
      { name: 'compression.type', value: 'snappy' },
    ],
  },
  {
    topic: 'wallet.transactions',
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: '2592000000' },
      { name: 'compression.type', value: 'gzip' },
    ],
  },
]

async function createTopics(admin: Admin) {
  try {
    console.log('🔍 Checking existing topics...')
    const existingTopics = await admin.listTopics()

    const topicsToCreate = topicsConfig.filter(
      (config) => !existingTopics.includes(config.topic)
    )

    if (topicsToCreate.length === 0) {
      console.log('✅ All topics already exist')
      return
    }

    console.log(`📝 Creating ${topicsToCreate.length} topics...`)
    await admin.createTopics({
      topics: topicsToCreate.map(({ topic, numPartitions, replicationFactor, configEntries }) => ({
        topic,
        numPartitions,
        replicationFactor,
        configEntries,
      })),
    })

    console.log('✅ Topics created successfully:')
    topicsToCreate.forEach((config) => {
      console.log(`   - ${config.topic} (${config.numPartitions} partitions)`)
    })
  } catch (error) {
    console.error('❌ Error creating topics:', error)
    throw error
  }
}

async function main() {
  const admin = kafka.admin()

  try {
    console.log('📡 Connecting to Kafka...')
    await admin.connect()
    console.log('✅ Connected to Kafka')

    await createTopics(admin)

    const topics = await admin.listTopics()
    console.log('\n📊 All topics:')
    topics.forEach((topic) => console.log(`   - ${topic}`))
  } catch (error) {
    console.error('❌ Failed to setup Kafka topics:', error)
    process.exit(1)
  } finally {
    await admin.disconnect()
    console.log('\n👋 Disconnected from Kafka')
  }
}

main()





