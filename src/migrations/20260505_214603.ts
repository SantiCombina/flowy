import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "zones" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"owner_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "clients" ADD COLUMN "zone_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "zones_id" integer;
  ALTER TABLE "zones" ADD CONSTRAINT "zones_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "zones_owner_idx" ON "zones" USING btree ("owner_id");
  CREATE INDEX "zones_updated_at_idx" ON "zones" USING btree ("updated_at");
  CREATE INDEX "zones_created_at_idx" ON "zones" USING btree ("created_at");
  ALTER TABLE "clients" ADD CONSTRAINT "clients_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_zones_fk" FOREIGN KEY ("zones_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "clients_zone_idx" ON "clients" USING btree ("zone_id");
  CREATE INDEX "payload_locked_documents_rels_zones_id_idx" ON "payload_locked_documents_rels" USING btree ("zones_id");`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // ⚠️ ADVERTENCIA: Esta migración ELIMINA la tabla "zones" y TODOS sus datos.
  // Los clientes con zonas asignadas perderán la referencia (zone_id se setea a null).
  // Si necesitas conservar los datos, haz un backup antes de ejecutar esta migración.
  await db.execute(sql`
   ALTER TABLE "zones" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "zones" CASCADE;
  ALTER TABLE "clients" DROP CONSTRAINT "clients_zone_id_zones_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_zones_fk";
  
  DROP INDEX "clients_zone_idx";
  DROP INDEX "payload_locked_documents_rels_zones_id_idx";
  ALTER TABLE "clients" DROP COLUMN "zone_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "zones_id";`);
}
