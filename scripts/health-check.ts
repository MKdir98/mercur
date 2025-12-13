import { Kafka } from 'kafkajs'
import { Client } from '@elastic/elasticsearch'
import { createClient } from 'redis'

interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy'
  message: string
  responseTime?: number
}

async function checkKafka(): Promise<ServiceHealth> {
  const startTime = Date.now()
  try {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'health-check',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      connectionTimeout: 3000,
    })

    const admin = kafka.admin()
    await admin.connect()
    await admin.listTopics()
    await admin.disconnect()

    return {
      name: 'Kafka',
      status: 'healthy',
      message: 'Connected successfully',
      responseTime: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      name: 'Kafka',
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - startTime,
    }
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const startTime = Date.now()
  try {
    const redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })

    await redis.connect()
    await redis.ping()
    await redis.disconnect()

    return {
      name: 'Redis',
      status: 'healthy',
      message: 'Connected successfully',
      responseTime: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      name: 'Redis',
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - startTime,
    }
  }
}

async function checkElasticsearch(): Promise<ServiceHealth> {
  const startTime = Date.now()
  try {
    const client = new Client({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    })

    const health = await client.cluster.health()

    return {
      name: 'Elasticsearch',
      status: health.status === 'red' ? 'unhealthy' : 'healthy',
      message: `Cluster status: ${health.status}`,
      responseTime: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      name: 'Elasticsearch',
      status: 'unhealthy',
      message: error.message,
      responseTime: Date.now() - startTime,
    }
  }
}

async function main() {
  console.log('🏥 Running health checks...\n')

  const checks = await Promise.all([
    checkKafka(),
    checkRedis(),
    checkElasticsearch(),
  ])

  let allHealthy = true

  checks.forEach((check) => {
    const icon = check.status === 'healthy' ? '✅' : '❌'
    console.log(`${icon} ${check.name}: ${check.message} (${check.responseTime}ms)`)
    if (check.status === 'unhealthy') {
      allHealthy = false
    }
  })

  console.log('')

  if (allHealthy) {
    console.log('🎉 All services are healthy!')
    process.exit(0)
  } else {
    console.log('⚠️  Some services are unhealthy')
    process.exit(1)
  }
}

main()



