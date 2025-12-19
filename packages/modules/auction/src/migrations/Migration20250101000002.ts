import { Migration } from '@mikro-orm/migrations'

export class Migration20250101000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "auction" ("id" text not null, "title" text not null, "description" text null, "start_date" timestamptz not null, "end_date" timestamptz null, "status" text check ("status" in (\'draft\', \'scheduled\', \'active\', \'ended\', \'cancelled\')) not null default \'draft\', "is_enabled" boolean not null default false, "party_registration_cutoff_hours" integer not null default 2, "metadata" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "auction_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_auction_status" on "auction" ("status");')
    this.addSql('create index if not exists "IDX_auction_start_date" on "auction" ("start_date");')
    this.addSql('create index if not exists "IDX_auction_deleted_at" on "auction" ("deleted_at");')

    this.addSql(
      'create table if not exists "auction_party" ("id" text not null, "auction_id" text not null, "product_id" text not null, "seller_id" text not null, "starting_price" numeric not null, "bid_increment" numeric not null, "current_bid" numeric null, "current_winner_id" text null, "status" text check ("status" in (\'pending\', \'active\', \'completed\', \'cancelled\', \'failed\')) not null default \'pending\', "position" integer not null, "timer_duration_seconds" integer not null default 600, "timer_expires_at" timestamptz null, "started_at" timestamptz null, "ended_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "auction_party_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_auction_party_auction_id" on "auction_party" ("auction_id");')
    this.addSql('create index if not exists "IDX_auction_party_product_id" on "auction_party" ("product_id");')
    this.addSql('create index if not exists "IDX_auction_party_seller_id" on "auction_party" ("seller_id");')
    this.addSql('create index if not exists "IDX_auction_party_current_winner_id" on "auction_party" ("current_winner_id");')
    this.addSql('create index if not exists "IDX_auction_party_status" on "auction_party" ("status");')
    this.addSql('create index if not exists "IDX_auction_party_position" on "auction_party" ("auction_id", "position");')

    this.addSql(
      'create table if not exists "bid" ("id" text not null, "party_id" text not null, "customer_id" text not null, "amount" numeric not null, "status" text check ("status" in (\'pending\', \'accepted\', \'rejected\', \'outbid\')) not null default \'pending\', "rejection_reason" text null, "processed_at" timestamptz null, "correlation_id" text null, "created_at" timestamptz not null, constraint "bid_pkey" primary key ("id"));'
    )
    this.addSql('create index if not exists "IDX_bid_party_id" on "bid" ("party_id");')
    this.addSql('create index if not exists "IDX_bid_customer_id" on "bid" ("customer_id");')
    this.addSql('create index if not exists "IDX_bid_correlation_id" on "bid" ("correlation_id");')
    this.addSql('create index if not exists "IDX_bid_status" on "bid" ("status");')
    this.addSql('create index if not exists "IDX_bid_created_at" on "bid" ("created_at");')
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "bid" cascade;')
    this.addSql('drop table if exists "auction_party" cascade;')
    this.addSql('drop table if exists "auction" cascade;')
  }
}






