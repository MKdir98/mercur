import { Migration } from '@mikro-orm/migrations';

export class Migration20250701000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_color" ("id" text not null, "value" text not null, "hex_code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_color_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_color_value_unique" ON "product_color" (value) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_color_deleted_at" ON "product_color" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_color" cascade;`);
  }

}
