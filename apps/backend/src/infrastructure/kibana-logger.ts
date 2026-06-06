import { Client } from '@elastic/elasticsearch'

const ENV = process.env.APP_ENV || 'production'
const PROJECT = 'doorfestival'

// Index names — override via env vars
const APP_LOGS_INDEX =
  process.env.KIBANA_APP_LOGS_INDEX || 'doorfestival-app-logs'
const EXTERNAL_CALLS_INDEX =
  process.env.KIBANA_EXTERNAL_CALLS_INDEX || 'doorfestival-external-calls'
const API_REQUESTS_INDEX =
  process.env.KIBANA_API_REQUESTS_INDEX || 'doorfestival-api-requests'

// ── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AppLogEntry {
  level: LogLevel
  message: string
  service?: string
  trace_id?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, unknown>
}

export interface ExternalCallEntry {
  service_name: string
  action: string
  endpoint?: string
  method?: string
  status: 'success' | 'error' | 'pending'
  http_status_code?: number
  duration_ms?: number
  request?: Record<string, unknown>
  response?: Record<string, unknown>
  error_message?: string
  metadata?: Record<string, unknown>
}

export interface ApiRequestEntry {
  method: string
  path: string
  api_type: 'store' | 'admin' | 'vendor' | 'hooks' | 'other'
  http_status_code: number
  duration_ms: number
  request_body?: Record<string, unknown>
  response_body?: Record<string, unknown>
  query_params?: Record<string, unknown>
  ip?: string
  user_agent?: string
  customer_id?: string
  seller_id?: string
  error?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function base() {
  return {
    '@timestamp': new Date().toISOString(),
    project: PROJECT,
    environment: ENV
  }
}

// Silently drop sensitive fields so passwords/OTPs never reach Kibana
const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'code',
  'token',
  'secret',
  'authorization'
])

function sanitize(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!obj) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}

// Truncate large JSON blobs so a single document stays under ~10 KB
function truncate(
  obj: Record<string, unknown> | undefined,
  maxLen = 8192
): Record<string, unknown> | undefined {
  if (!obj) return undefined
  const str = JSON.stringify(obj)
  if (str.length <= maxLen) return obj
  return { _truncated: true, _preview: str.slice(0, maxLen) }
}

// Dedicated client for the monitoring-server ES (separate from product-search ES)
let kibanaClient: Client | null = null

function getKibanaClient(): Client {
  if (!kibanaClient) {
    kibanaClient = new Client({
      node: process.env.KIBANA_ES_NODE || 'http://localhost:9200',
      maxRetries: 3,
      requestTimeout: 5000,
    })
  }
  return kibanaClient
}

async function ship(index: string, doc: Record<string, unknown>) {
  if (!process.env.KIBANA_ES_NODE) return
  try {
    await getKibanaClient().index({ index, document: doc })
  } catch {
    // Logging must never break the main request path
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const kibanaLogger = {
  /**
   * General application log — replaces ad-hoc console.error/warn/info calls
   * that should be searchable in Kibana.
   */
  log(entry: AppLogEntry): void {
    void ship(APP_LOGS_INDEX, { ...base(), ...entry })
  },

  info(
    message: string,
    opts: Omit<AppLogEntry, 'level' | 'message'> = {}
  ): void {
    kibanaLogger.log({ level: 'info', message, ...opts })
  },

  warn(
    message: string,
    opts: Omit<AppLogEntry, 'level' | 'message'> = {}
  ): void {
    kibanaLogger.log({ level: 'warn', message, ...opts })
  },

  error(
    message: string,
    opts: Omit<AppLogEntry, 'level' | 'message'> = {}
  ): void {
    kibanaLogger.log({ level: 'error', message, ...opts })
  },

  /**
   * Outbound call to an external web service (payment gateway, Postex, SMS, …).
   * Maps directly to the service_log table structure so you can correlate DB rows
   * with Kibana documents.
   */
  externalCall(entry: ExternalCallEntry): void {
    void ship(EXTERNAL_CALLS_INDEX, {
      ...base(),
      ...entry,
      request: truncate(sanitize(entry.request)),
      response: truncate(entry.response)
    })
  },

  /**
   * Inbound HTTP request/response — called by the apiRequestLogger middleware.
   */
  apiRequest(entry: ApiRequestEntry): void {
    void ship(API_REQUESTS_INDEX, {
      ...base(),
      ...entry,
      request_body: truncate(sanitize(entry.request_body)),
      response_body: truncate(entry.response_body)
    })
  }
}

// ── Index template setup ─────────────────────────────────────────────────────

export async function ensureKibanaIndexTemplates(): Promise<void> {
  const client = getElasticsearchClient()

  const templates = [
    {
      name: 'doorfestival-app-logs-template',
      pattern: `${APP_LOGS_INDEX}-*`,
      fallbackIndex: APP_LOGS_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          project: { type: 'keyword' },
          environment: { type: 'keyword' },
          level: { type: 'keyword' },
          service: { type: 'keyword' },
          message: {
            type: 'text',
            fields: { keyword: { type: 'keyword', ignore_above: 512 } }
          },
          trace_id: { type: 'keyword' },
          'error.message': { type: 'text' },
          'error.stack': { type: 'text', index: false },
          'error.code': { type: 'keyword' }
        }
      }
    },
    {
      name: 'doorfestival-external-calls-template',
      pattern: `${EXTERNAL_CALLS_INDEX}-*`,
      fallbackIndex: EXTERNAL_CALLS_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          project: { type: 'keyword' },
          environment: { type: 'keyword' },
          service_name: { type: 'keyword' },
          action: { type: 'keyword' },
          endpoint: { type: 'keyword' },
          method: { type: 'keyword' },
          status: { type: 'keyword' },
          http_status_code: { type: 'short' },
          duration_ms: { type: 'integer' },
          error_message: { type: 'text' }
        }
      }
    },
    {
      name: 'doorfestival-api-requests-template',
      pattern: `${API_REQUESTS_INDEX}-*`,
      fallbackIndex: API_REQUESTS_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          project: { type: 'keyword' },
          environment: { type: 'keyword' },
          method: { type: 'keyword' },
          path: { type: 'keyword' },
          api_type: { type: 'keyword' },
          http_status_code: { type: 'short' },
          duration_ms: { type: 'integer' },
          ip: { type: 'ip' },
          customer_id: { type: 'keyword' },
          seller_id: { type: 'keyword' },
          error: { type: 'text' }
        }
      }
    }
  ]

  for (const tpl of templates) {
    try {
      await client.indices.putIndexTemplate({
        name: tpl.name,
        body: {
          index_patterns: [tpl.pattern, tpl.fallbackIndex],
          template: { mappings: tpl.mappings },
          priority: 200
        }
      } as any)
    } catch (err) {
      console.error(`[kibana] Failed to create template ${tpl.name}:`, err)
    }
  }
}
