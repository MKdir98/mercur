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

export async function logExternalServiceCall(
  container: any,
  entry: ExternalServiceLogEntry
): Promise<void> {
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
