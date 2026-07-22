import { Migration } from "@mikro-orm/migrations"

export class Migration20260722000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `CREATE TABLE IF NOT EXISTS "feature_module" (
        "id" TEXT NOT NULL,
        "module_name" TEXT NOT NULL,
        "is_gated" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "feature_module_pkey" PRIMARY KEY ("id")
      );`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_feature_module_module_name" ON "feature_module" ("module_name");`
    )

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "feature_grant" (
        "id" TEXT NOT NULL,
        "module_name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "granted_by" TEXT NULL,
        "expires_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "feature_grant_pkey" PRIMARY KEY ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_feature_grant_module_phone" ON "feature_grant" ("module_name", "phone");`
    )

    // Seed the first soft-launched module: Remitation checkout is hidden from
    // everyone until an admin grants specific phone numbers access.
    this.addSql(
      `INSERT INTO "feature_module" ("id", "module_name", "is_gated")
       VALUES ('featmod_remitation', 'remitation', TRUE)
       ON CONFLICT ("module_name") DO NOTHING;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_feature_grant_module_phone";`)
    this.addSql(`DROP TABLE IF EXISTS "feature_grant";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_feature_module_module_name";`)
    this.addSql(`DROP TABLE IF EXISTS "feature_module";`)
  }
}
