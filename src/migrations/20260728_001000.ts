import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "sales"
    SET
      "payment_status" = 'collected'::"enum_sales_payment_status",
      "amount_paid" = "owner_amount_paid",
      "collected_at" = COALESCE("owner_collected_at", "collected_at", "updated_at", now())
    WHERE
      "owner_payment_status" = 'collected'
      AND "owner_amount_paid" IS NOT NULL
      AND "total" IS NOT NULL
      AND "owner_amount_paid" >= "total"
      AND (
        "payment_status" != 'collected'
        OR "amount_paid" IS NULL
        OR "amount_paid" < "owner_amount_paid"
      );

    UPDATE "sales"
    SET
      "payment_status" = 'collected'::"enum_sales_payment_status",
      "collected_at" = COALESCE("owner_collected_at", "collected_at", "updated_at", now())
    WHERE
      "payment_status" != 'collected'
      AND "amount_paid" IS NOT NULL
      AND "total" IS NOT NULL
      AND "total" > 0
      AND (
        "amount_paid" > "total"
        OR ABS("amount_paid" - "total") <= 0.1
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql``);
}
