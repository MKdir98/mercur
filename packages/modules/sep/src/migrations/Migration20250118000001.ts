import { Migration } from '@mikro-orm/migrations'

export class Migration20250118000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "sep_transaction" ("id" text not null, "wallet_transaction_id" text null, "token" text not null, "ref_num" text null, "trace_no" text null, "res_num" text not null, "amount" numeric not null, "status" text check ("status" in (\'pending\', \'verified\', \'failed\', \'cancelled\', \'reversed\')) not null default \'pending\', "callback_url" text not null, "description" text null, "metadata" jsonb null, "verified_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "sep_transaction_pkey" primary key ("id"));'
    )
    this.addSql('create unique index if not exists "IDX_sep_transaction_token" on "sep_transaction" ("token");')
    this.addSql('create index if not exists "IDX_sep_transaction_wallet_transaction_id" on "sep_transaction" ("wallet_transaction_id") where "wallet_transaction_id" IS NOT NULL;')
    this.addSql('create index if not exists "IDX_sep_transaction_ref_num" on "sep_transaction" ("ref_num") where "ref_num" IS NOT NULL;')
    this.addSql('create index if not exists "IDX_sep_transaction_res_num" on "sep_transaction" ("res_num");')
    this.addSql('create index if not exists "IDX_sep_transaction_status" on "sep_transaction" ("status");')
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "sep_transaction" cascade;')
  }
}


