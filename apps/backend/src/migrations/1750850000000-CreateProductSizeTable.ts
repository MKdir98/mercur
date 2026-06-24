import { Migration } from '@mikro-orm/migrations'

export class Migration1750850000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_size" (
        "id"         TEXT         NOT NULL PRIMARY KEY,
        "name"       TEXT         NOT NULL,
        "width"      SMALLINT     NOT NULL,
        "height"     SMALLINT     NOT NULL,
        "length"     SMALLINT     NOT NULL,
        "sort_order" SMALLINT     NOT NULL DEFAULT 0,
        "is_active"  BOOLEAN      NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `)

    this.addSql(`
      INSERT INTO "product_size" (id, name, width, height, length, sort_order, is_active) VALUES
        ('ps_size_01', 'سایز 1 (10*10*15)',  10, 15, 10, 1, true),
        ('ps_size_02', 'سایز 2 (10*15*20)',  10, 20, 15, 2, true),
        ('ps_size_03', 'سایز 3 (15*20*20)',  15, 20, 20, 3, true),
        ('ps_size_04', 'سایز 4 (20*20*30)',  20, 30, 20, 4, true),
        ('ps_size_05', 'سایز 5 (20*25*35)',  25, 35, 25, 5, true),
        ('ps_size_06', 'سایز 6 (20*35*45)',  20, 45, 35, 6, true),
        ('ps_size_07', 'سایز 7 (25*30*40)',  25, 40, 30, 7, true),
        ('ps_size_08', 'سایز 8 (30*40*45)',  30, 45, 40, 8, true),
        ('ps_size_09', 'سایز 9 (35*45*55)',  35, 55, 45, 9, true);
    `)
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "product_size";')
  }
}
