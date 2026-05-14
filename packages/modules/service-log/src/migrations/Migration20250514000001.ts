import { Migration } from '@mikro-orm/migrations'

export class Migration20250514000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "service_log" (
        "id" TEXT NOT NULL,
        "service_name" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "endpoint" TEXT NULL,
        "status" TEXT NOT NULL,
        "request_data" JSONB NULL,
        "response_data" JSONB NULL,
        "duration_ms" NUMERIC NULL,
        "error_message" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "service_log_pkey" PRIMARY KEY ("id")
      );`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_service_log_service_name" ON "service_log" ("service_name");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_service_log_action" ON "service_log" ("action");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_service_log_status" ON "service_log" ("status");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_service_log_created_at" ON "service_log" ("created_at");`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_service_log_created_at";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_service_log_status";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_service_log_action";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_service_log_service_name";`)
    this.addSql(`DROP TABLE IF EXISTS "service_log";`)
  }
}
