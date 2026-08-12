import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales_payment_unify_backup" (
      "id" integer PRIMARY KEY NOT NULL,
      "owner_amount_paid" numeric NOT NULL,
      "owner_payment_status" text NOT NULL,
      "owner_collected_at" timestamp(3) with time zone
    );

    INSERT INTO "sales_payment_unify_backup" ("id", "owner_amount_paid", "owner_payment_status", "owner_collected_at")
    SELECT "id", "owner_amount_paid", "owner_payment_status"::text, "owner_collected_at"
    FROM "sales"
    ON CONFLICT ("id") DO NOTHING;
  `);

  await db.execute(sql`
    DO $$
    DECLARE
      null_amount_count integer;
      null_status_count integer;
    BEGIN
      SELECT count(*) INTO null_amount_count
      FROM "sales"
      WHERE "owner_amount_paid" IS NULL;

      IF null_amount_count > 0 THEN
        RAISE EXCEPTION 'Preflight FAILED: % sales have NULL owner_amount_paid. Owner data is not complete; aborting unification.',
          null_amount_count;
      END IF;

      SELECT count(*) INTO null_status_count
      FROM "sales"
      WHERE "owner_payment_status" IS NULL;

      IF null_status_count > 0 THEN
        RAISE EXCEPTION 'Preflight FAILED: % sales have NULL owner_payment_status. Owner data is not complete; aborting unification.',
          null_status_count;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    UPDATE "sales"
    SET
      "amount_paid" = "owner_amount_paid",
      "payment_status" = "owner_payment_status"::text::"enum_sales_payment_status",
      "collected_at" = "owner_collected_at"
    WHERE
      "amount_paid" IS DISTINCT FROM "owner_amount_paid"
      OR "payment_status"::text IS DISTINCT FROM "owner_payment_status"::text
      OR "collected_at" IS DISTINCT FROM "owner_collected_at";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "sales_owner_payment_status_idx";
    ALTER TABLE "sales" DROP COLUMN IF EXISTS "owner_amount_paid";
    ALTER TABLE "sales" DROP COLUMN IF EXISTS "owner_payment_status";
    ALTER TABLE "sales" DROP COLUMN IF EXISTS "owner_collected_at";
  `);

  await db.execute(sql`
    DO $$ BEGIN
      DROP TYPE IF EXISTS "public"."enum_sales_owner_payment_status";
    EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_sales_owner_payment_status" AS ENUM('pending', 'partially_collected', 'collected');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "owner_amount_paid" numeric;
    ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "owner_payment_status" "enum_sales_owner_payment_status";
    ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "owner_collected_at" timestamp(3) with time zone;
  `);

  await db.execute(sql`
    UPDATE "sales"
    SET
      "owner_amount_paid" = "backup"."owner_amount_paid",
      "owner_payment_status" = "backup"."owner_payment_status"::"enum_sales_owner_payment_status",
      "owner_collected_at" = "backup"."owner_collected_at"
    FROM "sales_payment_unify_backup" AS "backup"
    WHERE "sales"."id" = "backup"."id";
  `);

  await db.execute(sql`
    UPDATE "sales"
    SET
      "owner_amount_paid" = COALESCE("sales"."amount_paid", 0),
      "owner_payment_status" = "sales"."payment_status"::text::"enum_sales_owner_payment_status",
      "owner_collected_at" = "sales"."collected_at"
    WHERE "owner_amount_paid" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "sales" ALTER COLUMN "owner_amount_paid" SET NOT NULL;
    ALTER TABLE "sales" ALTER COLUMN "owner_amount_paid" SET DEFAULT 0;
    ALTER TABLE "sales" ALTER COLUMN "owner_payment_status" SET NOT NULL;
    ALTER TABLE "sales" ALTER COLUMN "owner_payment_status" SET DEFAULT 'pending';
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "sales_payment_unify_backup";
  `);
}
