import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sales_delivery_status" AS ENUM('pending', 'delivered');
  ALTER TABLE "sales" ADD COLUMN "delivery_status" "enum_sales_delivery_status" DEFAULT 'pending' NOT NULL;
  ALTER TABLE "sales" ADD COLUMN "delivered_at" timestamp(3) with time zone;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sales" DROP COLUMN "delivery_status";
  ALTER TABLE "sales" DROP COLUMN "delivered_at";
  DROP TYPE "public"."enum_sales_delivery_status";`);
}
