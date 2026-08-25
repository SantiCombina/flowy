import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_sale_payments_payment_method" AS ENUM('transfer', 'cash', 'check');
    CREATE TYPE "public"."enum_sale_payments_source" AS ENUM('live', 'legacy');
    CREATE TABLE "sale_payments" (
      "id" serial PRIMARY KEY NOT NULL,
      "sale_id" integer NOT NULL,
      "seller_id" integer,
      "owner_id" integer,
      "amount" numeric NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "payment_method" "enum_sale_payments_payment_method" NOT NULL,
      "check_due_date" timestamp(3) with time zone,
      "registered_by_id" integer,
      "source" "enum_sale_payments_source" DEFAULT 'live' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sale_payments_id" integer;
    ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sale_payments_fk" FOREIGN KEY ("sale_payments_id") REFERENCES "public"."sale_payments"("id") ON DELETE cascade;
    CREATE INDEX "sale_payments_sale_idx" ON "sale_payments" USING btree ("sale_id");
    CREATE INDEX "sale_payments_seller_idx" ON "sale_payments" USING btree ("seller_id");
    CREATE INDEX "sale_payments_owner_idx" ON "sale_payments" USING btree ("owner_id");
    CREATE INDEX "sale_payments_date_idx" ON "sale_payments" USING btree ("date");
    CREATE INDEX "sale_payments_source_idx" ON "sale_payments" USING btree ("source");
    CREATE INDEX "sale_payments_created_at_idx" ON "sale_payments" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_sale_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("sale_payments_id");
    INSERT INTO "sale_payments" ("sale_id", "seller_id", "owner_id", "amount", "date", "payment_method", "check_due_date", "source")
    SELECT "sales"."id", "sales"."seller_id", "sales"."owner_id", "sales"."amount_paid", "sales"."date",
      COALESCE("sales"."payment_method"::text, 'cash')::"enum_sale_payments_payment_method", "sales"."check_due_date", 'legacy'::"enum_sale_payments_source"
    FROM "sales"
    WHERE "sales"."amount_paid" > 0
      AND NOT EXISTS (SELECT 1 FROM "sale_payments" WHERE "sale_payments"."sale_id" = "sales"."id" AND "sale_payments"."source" = 'legacy');
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sale_payments" DISABLE ROW LEVEL SECURITY;
    DROP TABLE "sale_payments" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sale_payments_id";
    DROP TYPE "public"."enum_sale_payments_source";
    DROP TYPE "public"."enum_sale_payments_payment_method";
  `);
}
