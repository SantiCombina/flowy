import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_budgets_status" AS ENUM('pending', 'approved', 'rejected', 'converted');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;

  CREATE TABLE IF NOT EXISTS "budgets_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "budgets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seller_id" integer NOT NULL,
  	"owner_id" integer NOT NULL,
  	"client_id" integer,
  	"client_phone" varchar,
  	"date" timestamp(3) with time zone NOT NULL,
  	"valid_until" timestamp(3) with time zone,
  	"total" numeric NOT NULL,
  	"status" "enum_budgets_status" DEFAULT 'pending' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "settings_budgets_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"column" varchar NOT NULL
  );

  ALTER TABLE "settings" ALTER COLUMN "items_per_page" SET DEFAULT '25';

  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "budgets_id" integer;
  EXCEPTION WHEN duplicate_column THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "budgets_items" ADD CONSTRAINT "budgets_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "budgets_items" ADD CONSTRAINT "budgets_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "budgets" ADD CONSTRAINT "budgets_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "budgets" ADD CONSTRAINT "budgets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "budgets" ADD CONSTRAINT "budgets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
   ALTER TABLE "settings_budgets_columns" ADD CONSTRAINT "settings_budgets_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "budgets_items_order_idx" ON "budgets_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "budgets_items_parent_id_idx" ON "budgets_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "budgets_items_variant_idx" ON "budgets_items" USING btree ("variant_id");
  CREATE INDEX IF NOT EXISTS "budgets_seller_idx" ON "budgets" USING btree ("seller_id");
  CREATE INDEX IF NOT EXISTS "budgets_owner_idx" ON "budgets" USING btree ("owner_id");
  CREATE INDEX IF NOT EXISTS "budgets_client_idx" ON "budgets" USING btree ("client_id");
  CREATE INDEX IF NOT EXISTS "budgets_date_idx" ON "budgets" USING btree ("date");
  CREATE INDEX IF NOT EXISTS "budgets_status_idx" ON "budgets" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "budgets_updated_at_idx" ON "budgets" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "budgets_created_at_idx" ON "budgets" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "settings_budgets_columns_order_idx" ON "settings_budgets_columns" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "settings_budgets_columns_parent_id_idx" ON "settings_budgets_columns" USING btree ("_parent_id");

  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_budgets_fk" FOREIGN KEY ("budgets_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "sales_date_idx" ON "sales" USING btree ("date");
  CREATE INDEX IF NOT EXISTS "sales_payment_method_idx" ON "sales" USING btree ("payment_method");
  CREATE INDEX IF NOT EXISTS "sales_payment_status_idx" ON "sales" USING btree ("payment_status");
  CREATE INDEX IF NOT EXISTS "sales_owner_payment_status_idx" ON "sales" USING btree ("owner_payment_status");
  CREATE INDEX IF NOT EXISTS "sales_delivery_status_idx" ON "sales" USING btree ("delivery_status");
  CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements" USING btree ("type");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_budgets_id_idx" ON "payload_locked_documents_rels" USING btree ("budgets_id");`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "payload_locked_documents_rels_budgets_id_idx";
  DROP INDEX IF EXISTS "stock_movements_type_idx";
  DROP INDEX IF EXISTS "sales_delivery_status_idx";
  DROP INDEX IF EXISTS "sales_owner_payment_status_idx";
  DROP INDEX IF EXISTS "sales_payment_status_idx";
  DROP INDEX IF EXISTS "sales_payment_method_idx";
  DROP INDEX IF EXISTS "sales_date_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_budgets_fk";
  DROP INDEX IF EXISTS "settings_budgets_columns_parent_id_idx";
  DROP INDEX IF EXISTS "settings_budgets_columns_order_idx";
  DROP INDEX IF EXISTS "budgets_created_at_idx";
  DROP INDEX IF EXISTS "budgets_updated_at_idx";
  DROP INDEX IF EXISTS "budgets_status_idx";
  DROP INDEX IF EXISTS "budgets_date_idx";
  DROP INDEX IF EXISTS "budgets_client_idx";
  DROP INDEX IF EXISTS "budgets_owner_idx";
  DROP INDEX IF EXISTS "budgets_seller_idx";
  DROP INDEX IF EXISTS "budgets_items_variant_idx";
  DROP INDEX IF EXISTS "budgets_items_parent_id_idx";
  DROP INDEX IF EXISTS "budgets_items_order_idx";
  DROP TABLE IF EXISTS "settings_budgets_columns" CASCADE;
  DROP TABLE IF EXISTS "budgets" CASCADE;
  DROP TABLE IF EXISTS "budgets_items" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "budgets_id";
  ALTER TABLE "settings" ALTER COLUMN "items_per_page" SET DEFAULT '10';
  DROP TYPE IF EXISTS "public"."enum_budgets_status";`);
}
