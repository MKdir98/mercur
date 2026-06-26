import { Migration } from "@mikro-orm/migrations";

const PRODUCT_SLOTS = [
  {
    id: "hm_media_products-section-1",
    key: "products-section-1",
    label: "Homepage Products — Section 1 (top)",
  },
  {
    id: "hm_media_products-section-2",
    key: "products-section-2",
    label: "Homepage Products — Section 2 (bottom)",
  },
] as const;

export class Migration20250626000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "homepage_media_item" ADD COLUMN IF NOT EXISTS "product_ids" text NULL;`
    );

    for (const slot of PRODUCT_SLOTS) {
      this.addSql(
        `INSERT INTO "homepage_media_item" ("id", "key", "label", "type", "image_url", "video_url", "link", "alt", "product_ids")
         SELECT '${slot.id}', '${slot.key}', '${slot.label.replace(/'/g, "''")}', 'products', NULL, NULL, NULL, NULL, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM "homepage_media_item" WHERE "key" = '${slot.key}' AND "deleted_at" IS NULL
         );`
      );
    }
  }

  override async down(): Promise<void> {
    for (const slot of PRODUCT_SLOTS) {
      this.addSql(
        `DELETE FROM "homepage_media_item" WHERE "key" = '${slot.key}';`
      );
    }
    this.addSql(
      `ALTER TABLE "homepage_media_item" DROP COLUMN IF EXISTS "product_ids";`
    );
  }
}
