import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH owner_first_sales AS (
      SELECT
        "id",
        "owner_amount_paid" AS "derived_amount_paid",
        CASE
          WHEN "total" IS NOT NULL
            AND "total" > 0
            AND (
              "owner_amount_paid" >= "total"
              OR ABS("owner_amount_paid" - "total") <= 0.1
            )
            THEN 'collected'::"enum_sales_payment_status"
          ELSE 'partially_collected'::"enum_sales_payment_status"
        END AS "derived_payment_status",
        CASE
          WHEN "total" IS NOT NULL
            AND "total" > 0
            AND (
              "owner_amount_paid" >= "total"
              OR ABS("owner_amount_paid" - "total") <= 0.1
            )
            THEN COALESCE("owner_collected_at", "collected_at", "updated_at", now())
          ELSE NULL
        END AS "derived_collected_at"
      FROM "sales"
      WHERE
        "owner_amount_paid" IS NOT NULL
        AND "owner_amount_paid" > 0
        AND (
          "owner_payment_status" IN ('collected', 'partially_collected')
          OR "owner_amount_paid" > 0
        )
    )
    UPDATE "sales"
    SET
      "amount_paid" = "owner_first_sales"."derived_amount_paid",
      "payment_status" = "owner_first_sales"."derived_payment_status",
      "collected_at" = "owner_first_sales"."derived_collected_at"
    FROM "owner_first_sales"
    WHERE
      "sales"."id" = "owner_first_sales"."id"
      AND (
        "sales"."amount_paid" IS DISTINCT FROM "owner_first_sales"."derived_amount_paid"
        OR "sales"."payment_status" IS DISTINCT FROM "owner_first_sales"."derived_payment_status"
        OR "sales"."collected_at" IS DISTINCT FROM "owner_first_sales"."derived_collected_at"
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql``);
}
