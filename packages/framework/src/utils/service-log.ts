export interface ExternalServiceLogEntry {
  service_name: string
  action: string
  endpoint?: string | null
  status: 'success' | 'error'
  request_data?: Record<string, unknown> | null
  response_data?: Record<string, unknown> | null
  duration_ms?: number | null
  error_message?: string | null
}

// Ship one document to Elasticsearch via plain HTTP — no package dependency needed.
function shipToKibana(entry: ExternalServiceLogEntry): void {
  const esNode = process.env.KIBANA_ES_NODE
  if (!esNode) return

  const index = process.env.KIBANA_EXTERNAL_CALLS_INDEX || 'doorfestival-external-calls'
  const doc = {
    '@timestamp': new Date().toISOString(),
    project: 'doorfestival',
    environment: process.env.APP_ENV || 'production',
    service_name: entry.service_name,
    action: entry.action,
    endpoint: entry.endpoint ?? undefined,
    status: entry.status,
    duration_ms: entry.duration_ms ?? undefined,
    request: entry.request_data ?? undefined,
    response: entry.response_data ?? undefined,
    error_message: entry.error_message ?? undefined,
  }

  // Fire-and-forget — never await, never throw
  fetch(`${esNode}/${index}/_doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  }).catch(() => {})
}

export async function logExternalServiceCall(
  container: any,
  entry: ExternalServiceLogEntry
): Promise<void> {
  // Ship to Kibana asynchronously — independent of the DB write
  shipToKibana(entry)

  try {
    const knex = container?.resolve?.('__pg_connection__')
    if (!knex) return
    const id = `slog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    await knex.raw(
      `INSERT INTO service_log (id, service_name, action, endpoint, status, request_data, response_data, duration_ms, error_message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, NOW(), NOW())`,
      [
        id,
        entry.service_name,
        entry.action,
        entry.endpoint ?? null,
        entry.status,
        entry.request_data != null ? JSON.stringify(entry.request_data) : null,
        entry.response_data != null ? JSON.stringify(entry.response_data) : null,
        entry.duration_ms ?? null,
        entry.error_message ?? null,
      ]
    )
  } catch {
    // never let logging break the main flow
  }
}
