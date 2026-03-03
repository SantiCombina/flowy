import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_sales_items_stock_source" AS ENUM('warehouse', 'personal');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_sales_payment_method" AS ENUM('cash', 'transfer', 'check');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "variant_id" integer NOT NULL,
      "quantity" numeric NOT NULL,
      "unit_price" numeric NOT NULL,
      "stock_source" "enum_sales_items_stock_source" NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales" (
      "id" serial PRIMARY KEY NOT NULL,
      "seller_id" integer NOT NULL,
      "owner_id" integer NOT NULL,
      "client_id" integer,
      "date" timestamp(3) with time zone NOT NULL,
      "payment_method" "enum_sales_payment_method" NOT NULL,
      "total" numeric NOT NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "sales_id" integer`);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sales" ADD CONSTRAINT "sales_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sales_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_items_order_idx" ON "sales_items" USING btree ("_order")`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "sales_items_parent_id_idx" ON "sales_items" USING btree ("_parent_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "sales_items_variant_idx" ON "sales_items" USING btree ("variant_id")`,
  );
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_seller_idx" ON "sales" USING btree ("seller_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_owner_idx" ON "sales" USING btree ("owner_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_client_idx" ON "sales" USING btree ("client_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_updated_at_idx" ON "sales" USING btree ("updated_at")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_created_at_idx" ON "sales" USING btree ("created_at")`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sales_id_idx" ON "payload_locked_documents_rels" USING btree ("sales_id")`,
  );
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "sales_items" DROP CONSTRAINT IF EXISTS "sales_items_variant_id_product_variants_id_fk"`,
  );
  await db.execute(sql`ALTER TABLE "sales_items" DROP CONSTRAINT IF EXISTS "sales_items_parent_id_fk"`);
  await db.execute(sql`ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_seller_id_users_id_fk"`);
  await db.execute(sql`ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_owner_id_users_id_fk"`);
  await db.execute(sql`ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_client_id_clients_id_fk"`);
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sales_fk"`,
  );
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sales_id"`);
  await db.execute(sql`DROP TABLE IF EXISTS "sales_items"`);
  await db.execute(sql`DROP TABLE IF EXISTS "sales"`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_sales_items_stock_source"`);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_sales_payment_method"`);
}
