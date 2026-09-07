import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_timezone" AS ENUM(
        'America/Argentina/Buenos_Aires',
        'America/Santiago',
        'America/Sao_Paulo',
        'America/Mexico_City'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" "enum_users_timezone" DEFAULT 'America/Argentina/Buenos_Aires';
  `);

  await db.execute(sql`
    ALTER TABLE "products" DROP COLUMN IF EXISTS "is_active";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
  `);

  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone";
  `);

  await db.execute(sql`
    DO $$ BEGIN
      DROP TYPE "public"."enum_users_timezone";
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$;
  `);
}
