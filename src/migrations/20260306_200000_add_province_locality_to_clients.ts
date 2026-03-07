import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "provincia" varchar`);
  await db.execute(sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "localidad" varchar`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "clients" DROP COLUMN IF EXISTS "provincia"`);
  await db.execute(sql`ALTER TABLE "clients" DROP COLUMN IF EXISTS "localidad"`);
}
