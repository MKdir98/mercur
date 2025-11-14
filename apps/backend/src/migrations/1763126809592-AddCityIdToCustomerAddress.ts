import { Migration } from '@mikro-orm/migrations'

export class Migration1763126809592 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "customer_address" 
      ADD COLUMN IF NOT EXISTS "city_id" TEXT;
    `)

    this.addSql(`
      ALTER TABLE "customer_address" 
      ADD CONSTRAINT "FK_customer_address_city" 
      FOREIGN KEY ("city_id") REFERENCES "city" ("id") 
      ON UPDATE CASCADE ON DELETE SET NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_address_city_id" 
      ON "customer_address" ("city_id") 
      WHERE "city_id" IS NOT NULL;
    `)

    this.addSql(`
      ALTER TABLE "cart_address" 
      ADD COLUMN IF NOT EXISTS "city_id" TEXT;
    `)

    this.addSql(`
      ALTER TABLE "cart_address" 
      ADD CONSTRAINT "FK_cart_address_city" 
      FOREIGN KEY ("city_id") REFERENCES "city" ("id") 
      ON UPDATE CASCADE ON DELETE SET NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_cart_address_city_id" 
      ON "cart_address" ("city_id") 
      WHERE "city_id" IS NOT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_customer_address_city_id";')
    this.addSql('ALTER TABLE "customer_address" DROP CONSTRAINT IF EXISTS "FK_customer_address_city";')
    this.addSql(`
      ALTER TABLE "customer_address" 
      DROP COLUMN IF EXISTS "city_id";
    `)

    this.addSql('DROP INDEX IF EXISTS "IDX_cart_address_city_id";')
    this.addSql('ALTER TABLE "cart_address" DROP CONSTRAINT IF EXISTS "FK_cart_address_city";')
    this.addSql(`
      ALTER TABLE "cart_address" 
      DROP COLUMN IF EXISTS "city_id";
    `)
  }
}

