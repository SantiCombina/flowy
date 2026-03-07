import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "min_stock"`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "min_stock" numeric DEFAULT 0 NOT NULL`);
}
