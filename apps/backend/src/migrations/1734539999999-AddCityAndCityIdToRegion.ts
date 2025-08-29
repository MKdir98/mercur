import { Migration } from '@mikro-orm/migrations'

export class Migration1734539999999 extends Migration {
  async up(): Promise<void> {
    // Create city table with Medusa-compatible structure
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "city" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "country_code" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `)

    // Create index for soft delete
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_city_deleted_at" ON "city" (deleted_at) WHERE deleted_at IS NULL;
    `)

    // Add city_id column to region table and create foreign key
    this.addSql(`
      ALTER TABLE "region"
      ADD COLUMN IF NOT EXISTS "city_id" TEXT;
    `)
    
    this.addSql(`
      ALTER TABLE "region"
      ADD CONSTRAINT "FK_region_city" FOREIGN KEY ("city_id") REFERENCES "city" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `)
  }

  async down(): Promise<void> {
    // Drop foreign key and column
    this.addSql('ALTER TABLE "region" DROP CONSTRAINT IF EXISTS "FK_region_city";')
    this.addSql('ALTER TABLE "region" DROP COLUMN IF EXISTS "city_id";')

    // Drop city table and index
    this.addSql('DROP INDEX IF EXISTS "IDX_city_deleted_at";')
    this.addSql('DROP TABLE IF EXISTS "city";')
  }
} 