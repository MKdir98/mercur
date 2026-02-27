import { Migration } from "@mikro-orm/migrations";

const SEED_ITEMS = [
  {
    id: "hm_media_hero-slide-1",
    key: "hero-slide-1",
    label: "Hero Carousel - Slide 1",
    type: "image",
    image_url: "/v2/hero/hero-desktop.png",
    video_url: null,
    link: "/products",
    alt: "Hero slide 1",
  },
  {
    id: "hm_media_hero-slide-2",
    key: "hero-slide-2",
    label: "Hero Carousel - Slide 2",
    type: "image",
    image_url: "/v2/hero/hero-desktop-2.png",
    video_url: null,
    link: "/products",
    alt: "Hero slide 2",
  },
  {
    id: "hm_media_hero-slide-3",
    key: "hero-slide-3",
    label: "Hero Carousel - Slide 3",
    type: "image",
    image_url: "/v2/hero/hero-desktop-3.png",
    video_url: null,
    link: "/products",
    alt: "Hero slide 3",
  },
  {
    id: "hm_media_banner-1-left",
    key: "banner-1-left",
    label: "Banner 1 - Left (Video + Poster)",
    type: "video",
    image_url: "/v2/banners/banner-1-left.png",
    video_url: "/v2/banners/banner-1-left.mp4",
    link: "/products",
    alt: "Featured Collection Video",
  },
  {
    id: "hm_media_banner-1-right",
    key: "banner-1-right",
    label: "Banner 1 - Right (Image)",
    type: "image",
    image_url: "/v2/banners/banner-1-right.png",
    video_url: null,
    link: "/products",
    alt: "Featured Collection",
  },
  {
    id: "hm_media_banner-2-left",
    key: "banner-2-left",
    label: "Banner 2 - Left (Image)",
    type: "image",
    image_url: "/v2/banners/banner-2-left.png",
    video_url: null,
    link: "/products",
    alt: "New Arrivals",
  },
  {
    id: "hm_media_banner-2-right",
    key: "banner-2-right",
    label: "Banner 2 - Right (Video + Poster)",
    type: "video",
    image_url: "/v2/banners/banner-2-right.png",
    video_url: "/v2/banners/banner-2-right.mp4",
    link: "/products",
    alt: "Brand Showcase Video",
  },
  {
    id: "hm_media_hero-single",
    key: "hero-single",
    label: "Hero Single (Bottom section)",
    type: "image",
    image_url: "/v2/hero/hero-desktop-alt.png",
    video_url: null,
    link: "/products",
    alt: "Shop all products",
  },
  {
    id: "hm_media_category-fallback",
    key: "category-fallback",
    label: "Category default image",
    type: "image",
    image_url: "/v2/banners/category-shoulder-bags.png",
    video_url: null,
    link: null,
    alt: "Category",
  },
];

export class Migration20250227000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "homepage_media_item" ("id" text not null, "key" text not null, "label" text not null, "type" text not null, "image_url" text null, "video_url" text null, "link" text null, "alt" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_media_item_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_homepage_media_item_key_unique" ON "homepage_media_item" (key) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_homepage_media_item_deleted_at" ON "homepage_media_item" (deleted_at) WHERE deleted_at IS NULL;'
    );

    for (const item of SEED_ITEMS) {
      const img = item.image_url ? `'${String(item.image_url).replace(/'/g, "''")}'` : "NULL";
      const vid = item.video_url ? `'${String(item.video_url).replace(/'/g, "''")}'` : "NULL";
      const lnk = item.link ? `'${String(item.link).replace(/'/g, "''")}'` : "NULL";
      const altVal = item.alt ? `'${String(item.alt).replace(/'/g, "''")}'` : "NULL";
      this.addSql(
        `INSERT INTO "homepage_media_item" ("id", "key", "label", "type", "image_url", "video_url", "link", "alt") VALUES ('${item.id}', '${item.key}', '${item.label}', '${item.type}', ${img}, ${vid}, ${lnk}, ${altVal}) ON CONFLICT (id) DO NOTHING;`
      );
    }
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "homepage_media_item" cascade;');
  }
}
