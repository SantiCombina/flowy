import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_commission_payments_payment_method" AS ENUM('transfer', 'cash', 'check');
  CREATE TABLE "commission_payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seller_id" integer NOT NULL,
  	"owner_id" integer,
  	"amount" numeric NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"payment_method" "enum_commission_payments_payment_method" NOT NULL,
  	"reference" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "sales" ADD COLUMN "commission_amount" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commission_payments_id" integer;
  ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "commission_payments_seller_idx" ON "commission_payments" USING btree ("seller_id");
  CREATE INDEX "commission_payments_owner_idx" ON "commission_payments" USING btree ("owner_id");
  CREATE INDEX "commission_payments_updated_at_idx" ON "commission_payments" USING btree ("updated_at");
  CREATE INDEX "commission_payments_created_at_idx" ON "commission_payments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commission_payments_fk" FOREIGN KEY ("commission_payments_id") REFERENCES "public"."commission_payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_commission_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("commission_payments_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "commission_payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "commission_payments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commission_payments_fk";
  
  DROP INDEX "payload_locked_documents_rels_commission_payments_id_idx";
  ALTER TABLE "sales" DROP COLUMN "commission_amount";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commission_payments_id";
  DROP TYPE "public"."enum_commission_payments_payment_method";`);
}
