export interface KafkaConfig {
  brokers: string[]
  clientId: string
  groupId: string
  topics: {
    serviceLogs: string
  }
}

export const getKafkaConfig = (): KafkaConfig => {
  const brokers = process.env.KAFKA_BROKERS || 'localhost:9092'
  
  return {
    brokers: brokers.split(',').map(b => b.trim()),
    clientId: process.env.KAFKA_CLIENT_ID || 'mercur-backend',
    groupId: process.env.KAFKA_GROUP_ID || 'mercur-logs-consumer',
    topics: {
      serviceLogs: 'service-logs'
    }
  }
}



