import { Client } from '@elastic/elasticsearch'

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
})

const indicesConfig = [
  {
    index: process.env.ELASTICSEARCH_AUCTION_INDEX || 'auction-logs',
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        level: { type: 'keyword' },
        message: { type: 'text' },
        party_id: { type: 'keyword' },
        auction_id: { type: 'keyword' },
        customer_id: { type: 'keyword' },
        bid_amount: { type: 'long' },
        bid_status: { type: 'keyword' },
        event_type: { type: 'keyword' },
        processing_time_ms: { type: 'integer' },
        correlation_id: { type: 'keyword' },
        metadata: { type: 'object', enabled: false },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      'index.lifecycle.name': 'auction-logs-policy',
      'index.lifecycle.rollover_alias': 'auction-logs',
    },
  },
  {
    index: process.env.ELASTICSEARCH_WALLET_INDEX || 'wallet-logs',
    mappings: {
      properties: {
        timestamp: { type: 'date' },
        level: { type: 'keyword' },
        message: { type: 'text' },
        wallet_id: { type: 'keyword' },
        customer_id: { type: 'keyword' },
        transaction_type: { type: 'keyword' },
        amount: { type: 'long' },
        balance_before: { type: 'long' },
        balance_after: { type: 'long' },
        status: { type: 'keyword' },
        correlation_id: { type: 'keyword' },
        metadata: { type: 'object', enabled: false },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      'index.lifecycle.name': 'wallet-logs-policy',
      'index.lifecycle.rollover_alias': 'wallet-logs',
    },
  },
]

async function createIndex(indexConfig: typeof indicesConfig[0]) {
  try {
    const exists = await client.indices.exists({ index: indexConfig.index })

    if (exists) {
      console.log(`✅ Index '${indexConfig.index}' already exists`)
      return
    }

    await client.indices.create({
      index: indexConfig.index,
      body: {
        mappings: indexConfig.mappings,
        settings: indexConfig.settings,
      },
    })

    console.log(`✅ Created index '${indexConfig.index}'`)
  } catch (error) {
    console.error(`❌ Error creating index '${indexConfig.index}':`, error)
    throw error
  }
}

async function setupILMPolicy() {
  try {
    const policyName = 'auction-logs-policy'
    const exists = await client.ilm.getLifecycle({ policy: policyName }).catch(() => false)

    if (exists) {
      console.log(`✅ ILM policy '${policyName}' already exists`)
      return
    }

    await client.ilm.putLifecycle({
      policy: policyName,
      body: {
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '7d',
                  max_size: '50gb',
                },
              },
            },
            delete: {
              min_age: '30d',
              actions: {
                delete: {},
              },
            },
          },
        },
      },
    })

    console.log(`✅ Created ILM policy '${policyName}'`)
  } catch (error) {
    console.error('❌ Error creating ILM policy:', error)
  }
}

async function main() {
  try {
    console.log('📡 Connecting to Elasticsearch...')
    const health = await client.cluster.health()
    console.log(`✅ Connected to Elasticsearch (status: ${health.status})`)

    console.log('\n🔧 Setting up ILM policy...')
    await setupILMPolicy()

    console.log('\n📝 Creating indices...')
    for (const indexConfig of indicesConfig) {
      await createIndex(indexConfig)
    }

    const indices = await client.cat.indices({ format: 'json' })
    console.log('\n📊 All indices:')
    indices.forEach((index: any) => {
      if (index.index.startsWith('auction-') || index.index.startsWith('wallet-')) {
        console.log(`   - ${index.index} (${index.health}, docs: ${index['docs.count']})`)
      }
    })

    console.log('\n✅ Elasticsearch setup completed successfully')
  } catch (error) {
    console.error('\n❌ Failed to setup Elasticsearch:', error)
    process.exit(1)
  }
}

main()



