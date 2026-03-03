import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "seller_type";
    ALTER TABLE "invitations" DROP COLUMN IF EXISTS "seller_type";
    DROP TYPE IF EXISTS "public"."enum_users_seller_type";
    DROP TYPE IF EXISTS "public"."enum_invitations_seller_type";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_users_seller_type" AS ENUM('fixed', 'mobile');
    CREATE TYPE "public"."enum_invitations_seller_type" AS ENUM('fixed', 'mobile');
    ALTER TABLE "users" ADD COLUMN "seller_type" "enum_users_seller_type" DEFAULT 'fixed';
    ALTER TABLE "invitations" ADD COLUMN "seller_type" "enum_invitations_seller_type" DEFAULT 'fixed';
  `);
}
