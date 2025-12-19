import { Migration } from '@mikro-orm/migrations'

export class Migration20250101000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "zarinpal_transaction" ("id" text not null, "wallet_transaction_id" text null, "authority" text not null, "ref_id" text null, "amount" numeric not null, "status" text check ("status" in (\'pending\', \'verified\', \'failed\', \'cancelled\')) not null default \'pending\', "callback_url" text not null, "description" text null, "metadata" jsonb null, "verified_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "zarinpal_transaction_pkey" primary key ("id"));'
    )
    this.addSql('create unique index if not exists "IDX_zarinpal_transaction_authority" on "zarinpal_transaction" ("authority");')
    this.addSql('create index if not exists "IDX_zarinpal_transaction_wallet_transaction_id" on "zarinpal_transaction" ("wallet_transaction_id");')
    this.addSql('create index if not exists "IDX_zarinpal_transaction_ref_id" on "zarinpal_transaction" ("ref_id");')
    this.addSql('create index if not exists "IDX_zarinpal_transaction_status" on "zarinpal_transaction" ("status");')
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "zarinpal_transaction" cascade;')
  }
}






