import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "minimum_stock" numeric DEFAULT 0 NOT NULL`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "minimum_stock"`);
}
