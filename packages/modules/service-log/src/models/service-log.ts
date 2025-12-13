import { model } from '@medusajs/framework/utils'

export const ServiceLog = model.define('service_log', {
  id: model.id({ prefix: 'slog' }).primaryKey(),
  service_name: model.text(),
  action: model.text(),
  status: model.text(),
  metadata: model.json().nullable(),
})

