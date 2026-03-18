import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "amount_paid" numeric DEFAULT 0 NOT NULL`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "sales" DROP COLUMN IF EXISTS "amount_paid"`);
}
