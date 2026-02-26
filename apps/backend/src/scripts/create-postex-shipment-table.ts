import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export default async function createPostexShipmentTable({ container }: ExecArgs) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!knex) {
    throw new Error('Database connection not available')
  }

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS "postex_shipment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "fulfillment_id" TEXT NOT NULL,
      "order_id" TEXT NOT NULL,
      "postex_parcel_id" TEXT NULL,
      "postex_tracking_code" TEXT NULL,
      "postex_request_data" JSONB NULL,
      "postex_response_data" JSONB NULL,
      "pickup_requested_at" TIMESTAMPTZ NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "error_message" TEXT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_fulfillment_id" ON "postex_shipment" (fulfillment_id)`
  )
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_order_id" ON "postex_shipment" (order_id)`
  )
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_tracking_code" ON "postex_shipment" (postex_tracking_code)`
  )
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_status" ON "postex_shipment" (status)`
  )
  await knex.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_postex_shipment_fulfillment_id" ON "postex_shipment" (fulfillment_id)`
  )

  logger.info('postex_shipment table created successfully')
}
