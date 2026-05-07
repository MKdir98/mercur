import { Migration } from "@mikro-orm/migrations";

const SLOTS = [
  {
    id: "hm_media_category-banner-1",
    key: "category-banner-1",
    label: "Category banner — slot 1",
  },
  {
    id: "hm_media_category-banner-2",
    key: "category-banner-2",
    label: "Category banner — slot 2",
  },
  {
    id: "hm_media_category-banner-3",
    key: "category-banner-3",
    label: "Category banner — slot 3",
  },
] as const;

export class Migration20250605000001 extends Migration {
  override async up(): Promise<void> {
    for (const slot of SLOTS) {
      this.addSql(
        `INSERT INTO "homepage_media_item" ("id", "key", "label", "type", "image_url", "video_url", "link", "alt")
         SELECT '${slot.id}', '${slot.key}', '${slot.label.replace(/'/g, "''")}', 'category', NULL, NULL, NULL, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM "homepage_media_item" WHERE "key" = '${slot.key}' AND "deleted_at" IS NULL
         );`
      );
    }
  }

  override async down(): Promise<void> {
    for (const slot of SLOTS) {
      this.addSql(
        `DELETE FROM "homepage_media_item" WHERE "key" = '${slot.key}';`
      );
    }
  }
}
