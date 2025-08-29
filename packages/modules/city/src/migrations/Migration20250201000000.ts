import { Migration } from '@mikro-orm/migrations';

export class Migration20250201000000 extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "city" ADD COLUMN IF NOT EXISTS "province" TEXT;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "city" DROP COLUMN IF EXISTS "province";');
  }
} 