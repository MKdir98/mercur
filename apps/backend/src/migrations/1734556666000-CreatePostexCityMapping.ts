import { Migration } from '@mikro-orm/migrations'

export class Migration1734556666000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "postex_city_mapping" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "city_id" TEXT NOT NULL,
        "state_id" TEXT NULL,
        "postex_city_code" TEXT NULL,
        "postex_province_code" TEXT NULL,
        "postex_city_name" TEXT NULL,
        "postex_province_name" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `)

    this.addSql(
      `ALTER TABLE "postex_city_mapping" ADD CONSTRAINT "FK_postex_city_mapping_city" FOREIGN KEY ("city_id") REFERENCES "city" ("id") ON UPDATE CASCADE ON DELETE CASCADE;`
    )

    this.addSql(
      `ALTER TABLE "postex_city_mapping" ADD CONSTRAINT "FK_postex_city_mapping_state" FOREIGN KEY ("state_id") REFERENCES "state" ("id") ON UPDATE CASCADE ON DELETE SET NULL;`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_city_mapping_deleted_at" ON "postex_city_mapping" (deleted_at) WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_postex_city_mapping_city" ON "postex_city_mapping" (city_id) WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_postex_city_mapping_city_code" ON "postex_city_mapping" (postex_city_code);`
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_city_mapping_city_code";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "UQ_postex_city_mapping_city";'
    )
    this.addSql(
      'DROP INDEX IF EXISTS "IDX_postex_city_mapping_deleted_at";'
    )

    this.addSql(
      'ALTER TABLE "postex_city_mapping" DROP CONSTRAINT IF EXISTS "FK_postex_city_mapping_state";'
    )
    this.addSql(
      'ALTER TABLE "postex_city_mapping" DROP CONSTRAINT IF EXISTS "FK_postex_city_mapping_city";'
    )

    this.addSql('DROP TABLE IF EXISTS "postex_city_mapping";')
  }
} 