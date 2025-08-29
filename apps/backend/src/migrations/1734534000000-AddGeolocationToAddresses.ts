import { Migration } from '@mikro-orm/migrations'

export class Migration1734534000000 extends Migration {
  async up(): Promise<void> {
    // Add latitude and longitude columns to address tables
    this.addSql(`
      ALTER TABLE "address" 
      ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8),
      ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
    `)

    // Add indexes for efficient location-based queries
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_address_location" 
      ON "address" USING gist (ll_to_earth("latitude", "longitude"))
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
    `)

    // Add a functional index for distance calculations
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_address_lat_lng" 
      ON "address" ("latitude", "longitude")
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
    `)
  }

  async down(): Promise<void> {
    // Remove indexes first
    this.addSql('DROP INDEX IF EXISTS "IDX_address_location";')
    this.addSql('DROP INDEX IF EXISTS "IDX_address_lat_lng";')
    
    // Remove columns
    this.addSql(`
      ALTER TABLE "address" 
      DROP COLUMN IF EXISTS "latitude",
      DROP COLUMN IF EXISTS "longitude";
    `)
  }
} 