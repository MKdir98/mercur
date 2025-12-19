import { Migration } from '@mikro-orm/migrations'

export class Migration20250101000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "wallet" ("id" text not null, "customer_id" text not null, "balance" numeric not null default 0, "blocked_balance" numeric not null default 0, "currency" text not null default \'IRR\', "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "wallet_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_wallet_customer_id" on "wallet" ("customer_id");')
    this.addSql('create index if not exists "IDX_wallet_deleted_at" on "wallet" ("deleted_at");')

    this.addSql(
      'create table if not exists "wallet_transaction" ("id" text not null, "wallet_id" text not null, "type" text check ("type" in (\'deposit\', \'withdraw\', \'block\', \'unblock\', \'debit\', \'credit\')) not null, "amount" numeric not null, "status" text check ("status" in (\'pending\', \'completed\', \'failed\', \'cancelled\')) not null default \'pending\', "reference_id" text null, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "wallet_transaction_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_wallet_transaction_wallet_id" on "wallet_transaction" ("wallet_id");')
    this.addSql('create index if not exists "IDX_wallet_transaction_reference_id" on "wallet_transaction" ("reference_id");')
    this.addSql('create index if not exists "IDX_wallet_transaction_created_at" on "wallet_transaction" ("created_at");')

    this.addSql(
      'create table if not exists "withdraw_request" ("id" text not null, "wallet_id" text not null, "customer_id" text not null, "amount" numeric not null, "sheba_number" text not null, "status" text check ("status" in (\'pending\', \'approved\', \'rejected\', \'processing\', \'completed\')) not null default \'pending\', "rejection_reason" text null, "admin_id" text null, "processed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "withdraw_request_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_withdraw_request_wallet_id" on "withdraw_request" ("wallet_id");')
    this.addSql('create index if not exists "IDX_withdraw_request_customer_id" on "withdraw_request" ("customer_id");')
    this.addSql('create index if not exists "IDX_withdraw_request_status" on "withdraw_request" ("status");')
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "withdraw_request" cascade;')
    this.addSql('drop table if exists "wallet_transaction" cascade;')
    this.addSql('drop table if exists "wallet" cascade;')
  }
}






