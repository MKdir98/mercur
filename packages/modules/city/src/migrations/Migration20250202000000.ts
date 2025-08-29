import { Migration } from '@mikro-orm/migrations';

export class Migration20250202000000 extends Migration {
  async up(): Promise<void> {
    // Create state table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "state" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "country_code" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `);
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_state_deleted_at" ON "state" (deleted_at) WHERE deleted_at IS NULL;');

    // Add state_id to city and drop province if present
    this.addSql('ALTER TABLE "city" ADD COLUMN IF NOT EXISTS "state_id" TEXT;');
    this.addSql('ALTER TABLE "city" ADD CONSTRAINT "FK_city_state" FOREIGN KEY ("state_id") REFERENCES "state" ("id") ON UPDATE CASCADE ON DELETE SET NULL;');
    this.addSql('ALTER TABLE "city" DROP COLUMN IF EXISTS "province";');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "city" DROP CONSTRAINT IF EXISTS "FK_city_state";');
    this.addSql('ALTER TABLE "city" DROP COLUMN IF EXISTS "state_id";');
    this.addSql('DROP INDEX IF EXISTS "IDX_state_deleted_at";');
    this.addSql('DROP TABLE IF EXISTS "state";');
  }
} 