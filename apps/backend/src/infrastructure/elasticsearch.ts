import { Client } from '@elastic/elasticsearch'

let elasticsearchClient: Client | null = null

export function getElasticsearchClient(): Client {
  if (elasticsearchClient) {
    return elasticsearchClient
  }

  elasticsearchClient = new Client({
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    maxRetries: 5,
    requestTimeout: 60000,
  })

  return elasticsearchClient
}

export async function closeElasticsearchClient(): Promise<void> {
  if (elasticsearchClient) {
    await elasticsearchClient.close()
    elasticsearchClient = null
  }
}

export interface LogLevel {
  ERROR: 'error'
  WARN: 'warn'
  INFO: 'info'
  DEBUG: 'debug'
}

export const LogLevel: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
}

export interface AuctionLogEntry {
  timestamp: Date
  level: keyof LogLevel
  message: string
  party_id?: string
  auction_id?: string
  customer_id?: string
  bid_amount?: number
  bid_status?: string
  event_type: string
  processing_time_ms?: number
  correlation_id?: string
  metadata?: Record<string, any>
}

export interface WalletLogEntry {
  timestamp: Date
  level: keyof LogLevel
  message: string
  wallet_id?: string
  customer_id?: string
  transaction_type?: string
  amount?: number
  balance_before?: number
  balance_after?: number
  status?: string
  correlation_id?: string
  metadata?: Record<string, any>
}

export class ElasticsearchLogger {
  private client: Client
  private indexName: string

  constructor(indexName: string) {
    this.client = getElasticsearchClient()
    this.indexName = indexName
  }

  async logAuction(entry: AuctionLogEntry): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        document: {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        },
      })
    } catch (error) {
      console.error('Failed to log to Elasticsearch:', error)
    }
  }

  async logWallet(entry: WalletLogEntry): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        document: {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        },
      })
    } catch (error) {
      console.error('Failed to log to Elasticsearch:', error)
    }
  }

  async bulkLog(entries: (AuctionLogEntry | WalletLogEntry)[]): Promise<void> {
    try {
      const operations = entries.flatMap((entry) => [
        { index: { _index: this.indexName } },
        {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        },
      ])

      await this.client.bulk({
        operations,
      })
    } catch (error) {
      console.error('Failed to bulk log to Elasticsearch:', error)
    }
  }

  async search(query: any): Promise<any> {
    try {
      return await this.client.search({
        index: this.indexName,
        ...query,
      })
    } catch (error) {
      console.error('Failed to search Elasticsearch:', error)
      throw error
    }
  }
}

export function createAuctionLogger(): ElasticsearchLogger {
  return new ElasticsearchLogger(process.env.ELASTICSEARCH_AUCTION_INDEX || 'auction-logs')
}

export function createWalletLogger(): ElasticsearchLogger {
  return new ElasticsearchLogger(process.env.ELASTICSEARCH_WALLET_INDEX || 'wallet-logs')
}






