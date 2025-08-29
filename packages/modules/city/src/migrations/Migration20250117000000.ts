import { Migration } from '@mikro-orm/migrations';

export class Migration20250117000000 extends Migration {

  async up(): Promise<void> {
    // Drop existing incorrectly structured city table if it exists
    this.addSql('DROP TABLE IF EXISTS "city" CASCADE;');
    
    // Remove existing city_id column from region table
    this.addSql('ALTER TABLE IF EXISTS "region" DROP CONSTRAINT IF EXISTS "FK_region_city";');
    this.addSql('ALTER TABLE IF EXISTS "region" DROP COLUMN IF EXISTS "city_id";');

    // Create city table with proper Medusa structure
    this.addSql(`
      CREATE TABLE "city" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "country_code" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `);

    // Create index for soft delete
    this.addSql('CREATE INDEX "IDX_city_deleted_at" ON "city" (deleted_at) WHERE deleted_at IS NULL;');

    // Add city_id column to region table and create foreign key
    this.addSql('ALTER TABLE "region" ADD COLUMN "city_id" TEXT;');
    this.addSql('ALTER TABLE "region" ADD CONSTRAINT "FK_region_city" FOREIGN KEY ("city_id") REFERENCES "city" ("id") ON UPDATE CASCADE ON DELETE SET NULL;');
  }

  async down(): Promise<void> {
    // Drop foreign key and column
    this.addSql('ALTER TABLE "region" DROP CONSTRAINT IF EXISTS "FK_region_city";');
    this.addSql('ALTER TABLE "region" DROP COLUMN IF EXISTS "city_id";');

    // Drop city table and index
    this.addSql('DROP INDEX IF EXISTS "IDX_city_deleted_at";');
    this.addSql('DROP TABLE IF EXISTS "city";');
  }

} 