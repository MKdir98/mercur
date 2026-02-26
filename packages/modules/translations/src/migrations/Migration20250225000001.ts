import { Migration } from '@mikro-orm/migrations';

export class Migration20250225000001 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table if not exists "translation" ("id" text not null, "source_text" text not null, "translated_text" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "translation_pkey" primary key ("id"));');
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_translation_source_text_unique" ON "translation" (source_text) WHERE deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_translation_deleted_at" ON "translation" (deleted_at) WHERE deleted_at IS NULL;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "translation" cascade;');
  }

}
