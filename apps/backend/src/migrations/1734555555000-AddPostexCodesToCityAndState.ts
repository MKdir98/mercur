import { Migration } from '@mikro-orm/migrations'

export class Migration1734555555000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "city" ADD COLUMN IF NOT EXISTS "postex_city_code" TEXT;`)
    this.addSql(`ALTER TABLE "state" ADD COLUMN IF NOT EXISTS "postex_province_code" TEXT;`)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_city_postex_city_code" ON "city" (postex_city_code);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_state_postex_province_code" ON "state" (postex_province_code);`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_city_postex_city_code";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_state_postex_province_code";`)

    this.addSql(
      `ALTER TABLE "city" DROP COLUMN IF EXISTS "postex_city_code";`
    )
    this.addSql(
      `ALTER TABLE "state" DROP COLUMN IF EXISTS "postex_province_code";`
    )
  }
} 