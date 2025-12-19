import { Migration } from '@mikro-orm/migrations'

export class Migration1763130000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
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
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_fulfillment_id" ON "postex_shipment" (fulfillment_id);`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_order_id" ON "postex_shipment" (order_id);`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_tracking_code" ON "postex_shipment" (postex_tracking_code);`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_shipment_status" ON "postex_shipment" (status);`
    )

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_postex_shipment_fulfillment_id" ON "postex_shipment" (fulfillment_id);`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'DROP INDEX IF EXISTS "UQ_postex_shipment_fulfillment_id";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_shipment_status";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_shipment_tracking_code";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_shipment_order_id";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_shipment_fulfillment_id";'
    )

    this.addSql('DROP TABLE IF EXISTS "postex_shipment";')
  }
}






