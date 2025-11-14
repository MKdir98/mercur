import { Migration } from '@mikro-orm/migrations'

export class Migration1762444748973 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "stock_location_address" 
      ADD COLUMN IF NOT EXISTS "city_id" TEXT;
    `)

    this.addSql(`
      ALTER TABLE "stock_location_address" 
      ADD CONSTRAINT "FK_stock_location_address_city" 
      FOREIGN KEY ("city_id") REFERENCES "city" ("id") 
      ON UPDATE CASCADE ON DELETE SET NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_location_address_city_id" 
      ON "stock_location_address" ("city_id") 
      WHERE "city_id" IS NOT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_stock_location_address_city_id";')
    this.addSql('ALTER TABLE "stock_location_address" DROP CONSTRAINT IF EXISTS "FK_stock_location_address_city";')
    this.addSql(`
      ALTER TABLE "stock_location_address" 
      DROP COLUMN IF EXISTS "city_id";
    `)
  }
}

