import { Migration } from '@mikro-orm/migrations';

export class Migration20250702000001 extends Migration {

  async up(): Promise<void> {
    this.addSql('ALTER TABLE "translation" ADD COLUMN IF NOT EXISTS "manually_edited" boolean NOT NULL DEFAULT false;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "translation" DROP COLUMN IF EXISTS "manually_edited";');
  }

}
