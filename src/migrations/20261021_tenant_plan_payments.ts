import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_tenant_plan_payments_payment_method" AS ENUM ('cash', 'transfer');
    CREATE TYPE "public"."enum_tenant_plan_payments_currency" AS ENUM ('ARS', 'USD');
    CREATE TABLE "tenant_plan_payments" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer NOT NULL,
      "plan_version_id" integer,
      "plan_label" varchar NOT NULL,
      "period_start" timestamp(3) with time zone NOT NULL,
      "period_end" timestamp(3) with time zone NOT NULL,
      "paid_at" timestamp(3) with time zone NOT NULL,
      "payment_method" "enum_tenant_plan_payments_payment_method" NOT NULL,
      "amount" numeric NOT NULL,
      "currency" "enum_tenant_plan_payments_currency" NOT NULL,
      "registered_by_id" integer NOT NULL,
      "updated_by_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "tenant_plan_payments" ADD CONSTRAINT "tenant_plan_payments_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    ALTER TABLE "tenant_plan_payments" ADD CONSTRAINT "tenant_plan_payments_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    ALTER TABLE "tenant_plan_payments" ADD CONSTRAINT "tenant_plan_payments_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    ALTER TABLE "tenant_plan_payments" ADD CONSTRAINT "tenant_plan_payments_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    CREATE INDEX "tenant_plan_payments_tenant_idx" ON "tenant_plan_payments" USING btree ("tenant_id");
    CREATE INDEX "tenant_plan_payments_plan_version_idx" ON "tenant_plan_payments" USING btree ("plan_version_id");
    CREATE INDEX "tenant_plan_payments_paid_at_idx" ON "tenant_plan_payments" USING btree ("paid_at");
    CREATE INDEX "tenant_plan_payments_registered_by_idx" ON "tenant_plan_payments" USING btree ("registered_by_id");
    CREATE INDEX "tenant_plan_payments_updated_by_idx" ON "tenant_plan_payments" USING btree ("updated_by_id");
    CREATE INDEX "tenant_plan_payments_updated_at_idx" ON "tenant_plan_payments" USING btree ("updated_at");
    CREATE INDEX "tenant_plan_payments_created_at_idx" ON "tenant_plan_payments" USING btree ("created_at");
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tenant_plan_payments_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenant_plan_payments_fk" FOREIGN KEY ("tenant_plan_payments_id") REFERENCES "public"."tenant_plan_payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    CREATE INDEX "payload_locked_documents_rels_tenant_plan_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("tenant_plan_payments_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tenant_plan_payments_fk";
    DROP INDEX "payload_locked_documents_rels_tenant_plan_payments_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tenant_plan_payments_id";
    DROP TABLE "tenant_plan_payments";
    DROP TYPE "public"."enum_tenant_plan_payments_payment_method";
    DROP TYPE "public"."enum_tenant_plan_payments_currency";
  `);
}
