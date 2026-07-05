import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'sale_deleted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'sale_edited';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'budget_created';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'budget_updated';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'budget_deleted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'budget_converted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'product_created';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'product_updated';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'product_deleted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'variant_created';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'variant_updated';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'variant_deleted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'seller_invited';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'seller_updated';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'seller_deleted';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'commission_paid';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'client_created';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'client_updated';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE IF NOT EXISTS 'client_deleted';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_type";
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('sale_created', 'payment_registered', 'stock_dispatched', 'stock_returned', 'stock_low', 'stock_adjusted');
  ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."enum_notifications_type" USING "type"::"public"."enum_notifications_type";`);
}
