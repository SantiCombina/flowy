import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "product_variants" RENAME COLUMN "price" TO "cost_price"`);
  await db.execute(
    sql`ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "profit_margin" numeric DEFAULT 0 NOT NULL`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "product_variants" RENAME COLUMN "cost_price" TO "price"`);
  await db.execute(sql`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "profit_margin"`);
}
