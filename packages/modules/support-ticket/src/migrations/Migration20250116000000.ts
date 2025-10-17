import { Migration } from '@mikro-orm/migrations';

export class Migration20250116000000 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table if not exists "support_ticket" ("id" text not null, "name" text not null, "email" text not null, "phone" text null, "type" text check ("type" in (\'support\', \'complaint\', \'partnership\', \'suggestion\')) not null, "subject" text not null, "message" text not null, "status" text check ("status" in (\'open\', \'in_progress\', \'resolved\', \'closed\')) not null default \'open\', "admin_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "support_ticket_pkey" primary key ("id"));');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_support_ticket_deleted_at" ON "support_ticket" (deleted_at) WHERE deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_support_ticket_status" ON "support_ticket" (status);');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_support_ticket_type" ON "support_ticket" (type);');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_support_ticket_created_at" ON "support_ticket" (created_at);');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "support_ticket" cascade;');
  }

}

