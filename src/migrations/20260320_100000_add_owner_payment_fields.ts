import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sales"
      ADD COLUMN IF NOT EXISTS "owner_payment_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "owner_amount_paid" NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "owner_collected_at" TIMESTAMP WITH TIME ZONE
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sales"
      DROP COLUMN IF EXISTS "owner_payment_status",
      DROP COLUMN IF EXISTS "owner_amount_paid",
      DROP COLUMN IF EXISTS "owner_collected_at"
  `);
}
