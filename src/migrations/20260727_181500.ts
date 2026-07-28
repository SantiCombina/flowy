import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "sales"
    SET
      "payment_status" = "owner_payment_status"::text::"enum_sales_payment_status",
      "amount_paid" = "owner_amount_paid",
      "collected_at" = "owner_collected_at"
    WHERE
      "owner_payment_status" IN ('collected', 'partially_collected')
      AND "payment_status" = 'pending'
      AND ("amount_paid" IS NULL OR "amount_paid" = 0)
      AND "owner_amount_paid" > 0;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql``);
}
