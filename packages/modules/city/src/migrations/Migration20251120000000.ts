import { Migration } from '@mikro-orm/migrations';

export class Migration20251120000000 extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "city" ADD COLUMN IF NOT EXISTS "postex_city_code" TEXT;');

    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_city_postex_city_code" ON "city" (postex_city_code);');
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_city_postex_city_code";');

    this.addSql('ALTER TABLE "city" DROP COLUMN IF EXISTS "postex_city_code";');
  }
}











