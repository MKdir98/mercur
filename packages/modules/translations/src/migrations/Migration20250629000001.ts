import { Migration } from '@mikro-orm/migrations';

export class Migration20250629000001 extends Migration {

  async up(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_translation_source_text_unique";');
    this.addSql('ALTER TABLE "translation" ADD COLUMN IF NOT EXISTS "entity_type" text null;');
    this.addSql('ALTER TABLE "translation" ADD COLUMN IF NOT EXISTS "entity_id" text null;');
    this.addSql('ALTER TABLE "translation" ADD COLUMN IF NOT EXISTS "field_name" text null;');
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_translation_entity_unique" ON "translation" (entity_type, entity_id, field_name) WHERE entity_type IS NOT NULL AND deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_translation_source_text" ON "translation" (source_text) WHERE deleted_at IS NULL;');
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_translation_entity_unique";');
    this.addSql('DROP INDEX IF EXISTS "IDX_translation_source_text";');
    this.addSql('ALTER TABLE "translation" DROP COLUMN IF EXISTS "entity_type";');
    this.addSql('ALTER TABLE "translation" DROP COLUMN IF EXISTS "entity_id";');
    this.addSql('ALTER TABLE "translation" DROP COLUMN IF EXISTS "field_name";');
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_translation_source_text_unique" ON "translation" (source_text) WHERE deleted_at IS NULL;');
  }

}
