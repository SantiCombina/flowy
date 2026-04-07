import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_iva_condition" AS ENUM('responsable_inscripto', 'monotributista', 'exento', 'no_responsable');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "business_cuit" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "business_phone" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "business_address" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "iva_condition" "enum_users_iva_condition";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "business_cuit";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "business_phone";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "business_address";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "iva_condition";
    DROP TYPE IF EXISTS "public"."enum_users_iva_condition";
  `);
}
