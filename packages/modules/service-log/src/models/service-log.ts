import { model } from '@medusajs/framework/utils'

export const ServiceLog = model.define('service_log', {
  id: model.id({ prefix: 'slog' }).primaryKey(),
  service_name: model.text(),
  action: model.text(),
  endpoint: model.text().nullable(),
  status: model.text(),
  request_data: model.json().nullable(),
  response_data: model.json().nullable(),
  duration_ms: model.number().nullable(),
  error_message: model.text().nullable(),
  metadata: model.json().nullable(),
})

