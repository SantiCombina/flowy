// Consolidated initial schema — generated from current dev DB state, with
// additional fields added to match the staged code changes in
// src/collections/Invitations.ts and src/collections/TenantEntitlementSnapshots.ts.
//
// This single migration creates the entire schema from empty and is the
// canonical source of truth for fresh production deploys.
//
// The migration is fully idempotent: it can be run safely on a DB that
// already has the schema (e.g., when migrating an existing production DB
// that was bootstrapped with the old per-feature migration chain).
//
// When this migration runs on a fresh prod DB, it creates everything from
// scratch in dependency order:
//   1. enums (types)
//   2. sequences
//   3. functions
//   4. tables
//   5. foreign keys
//   6. indexes
//   7. triggers
//   8. schema drift repair (fields added by staged collections/ changes)
//
// On a DB that already has the schema (most operations are no-ops via
// IF NOT EXISTS / DO $$ ... EXCEPTION / CREATE OR REPLACE).
//
// DO NOT regenerate this file unless the schema has fundamentally changed.
// For incremental changes, use `pnpm payload migrate:create` as usual.

import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // =================== ENUMS ===================
  await db.execute(sql`DO \$\$ BEGIN
  CREATE TYPE "public"."enum_budgets_status" AS ENUM('pending', 'approved', 'rejected', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_commission_payments_payment_method" AS ENUM('transfer', 'cash', 'check');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_entitlement_outbox_state" AS ENUM('pending', 'processing', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_invitations_role" AS ENUM('owner', 'seller');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_invitations_state" AS ENUM('pending', 'accepted', 'cancelled', 'replaced', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('sale_created', 'sale_deleted', 'sale_edited', 'payment_registered', 'stock_dispatched', 'stock_returned', 'stock_low', 'stock_adjusted', 'budget_created', 'budget_updated', 'budget_deleted', 'budget_converted', 'product_created', 'product_updated', 'product_deleted', 'variant_created', 'variant_updated', 'variant_deleted', 'seller_invited', 'seller_updated', 'seller_deleted', 'commission_paid', 'client_created', 'client_updated', 'client_deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_plan_versions_capabilities_capability" AS ENUM('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_plan_versions_plan_code" AS ENUM('basic', 'medium', 'professional');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_product_custom_fields_type" AS ENUM('text', 'number', 'boolean', 'select');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sale_payments_payment_method" AS ENUM('transfer', 'cash', 'check');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sale_payments_source" AS ENUM('live', 'legacy');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sales_delivery_status" AS ENUM('pending', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sales_items_stock_source" AS ENUM('warehouse', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sales_payment_method" AS ENUM('cash', 'transfer', 'check');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_sales_payment_status" AS ENUM('pending', 'partially_collected', 'collected');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_settings_items_per_page" AS ENUM('10', '25', '50');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_stock_movements_type" AS ENUM('entry', 'exit', 'adjustment', 'sale', 'dispatch_to_mobile', 'return_from_mobile', 'sale_cancelled', 'sale_edit');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_tenant_entitlement_snapshots_kind" AS ENUM('plan', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_users_entitlement_state" AS ENUM('provisioning', 'active', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_users_iva_condition" AS ENUM('responsable_inscripto', 'monotributista', 'exento', 'no_responsable');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'owner', 'seller');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_users_timezone" AS ENUM('America/Argentina/Buenos_Aires');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."tes_pending_grant_capability" AS ENUM('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."tes_pool_capability" AS ENUM('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TYPE "public"."tes_user_grant_capability" AS ENUM('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
`);

  // =================== SEQUENCES ===================
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS "public"."brands_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."budgets_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."clients_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."commission_payments_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."entitlement_outbox_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."entitlement_quota_locks_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."invitations_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."media_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."mobile_seller_inventory_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_kv_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_locked_documents_rels_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_migrations_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."payload_preferences_rels_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."plan_versions_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."presentations_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."product_custom_fields_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."product_variants_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."push_subscriptions_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."qualities_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."sale_payments_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."sales_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."settings_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."stock_movements_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."tenant_entitlement_snapshots_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."zones_id_seq";
`);

  // =================== FUNCTIONS ===================
  await db.execute(sql`CREATE OR REPLACE FUNCTION public.prevent_entitlement_child_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS \$function\$
    DECLARE
      parent_created_in_transaction boolean := false;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'plan_versions_capabilities' THEN
          SELECT EXISTS (
            SELECT 1 FROM "plan_versions"
            WHERE "id" = NEW."_parent_id"
              AND "xmin" = pg_current_xact_id()::xid
          ) INTO parent_created_in_transaction;
        ELSIF TG_TABLE_NAME IN ('tenant_entitlement_snapshots_pool', 'tenant_entitlement_snapshots_user_grants', 'tenant_entitlement_snapshots_pending_grants') THEN
          SELECT EXISTS (
            SELECT 1 FROM "tenant_entitlement_snapshots"
            WHERE "id" = NEW."_parent_id"
              AND "xmin" = pg_current_xact_id()::xid
          ) INTO parent_created_in_transaction;
        ELSIF TG_TABLE_NAME = 'tenant_entitlement_snapshots_user_grants_capabilities' THEN
          SELECT EXISTS (
            SELECT 1 FROM "tenant_entitlement_snapshots_user_grants"
            WHERE "id" = NEW."_parent_id"
              AND "xmin" = pg_current_xact_id()::xid
          ) INTO parent_created_in_transaction;
        ELSIF TG_TABLE_NAME = 'tenant_entitlement_snapshots_pending_grants_capabilities' THEN
          SELECT EXISTS (
            SELECT 1 FROM "tenant_entitlement_snapshots_pending_grants"
            WHERE "id" = NEW."_parent_id"
              AND "xmin" = pg_current_xact_id()::xid
          ) INTO parent_created_in_transaction;
        END IF;

        IF NOT COALESCE(parent_created_in_transaction, false) THEN
          RAISE EXCEPTION 'Entitlement child rows can only be inserted with their parent';
        END IF;

        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Entitlement version and snapshot child rows are immutable';
    END;
    \$function\$
;
CREATE OR REPLACE FUNCTION public.prevent_plan_versions_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS \$function\$
    BEGIN
      RAISE EXCEPTION 'Plan versions are immutable';
    END;
    \$function\$
;
CREATE OR REPLACE FUNCTION public.prevent_tenant_entitlement_snapshots_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS \$function\$
    BEGIN
      RAISE EXCEPTION 'Tenant entitlement snapshots are immutable';
    END;
    \$function\$
;
`);

  // =================== TABLES ===================
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "brands" (
  "id" integer NOT NULL DEFAULT nextval('brands_id_seq'::regclass),
  "name" character varying NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" integer NOT NULL DEFAULT nextval('budgets_id_seq'::regclass),
  "seller_id" integer NOT NULL,
  "owner_id" integer NOT NULL,
  "client_id" integer,
  "client_phone" character varying,
  "date" timestamp(3) with time zone NOT NULL,
  "valid_until" timestamp(3) with time zone,
  "total" numeric NOT NULL,
  "status" enum_budgets_status NOT NULL DEFAULT 'pending'::enum_budgets_status,
  "notes" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "budgets_items" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "variant_id" integer NOT NULL,
  "quantity" numeric NOT NULL,
  "unit_price" numeric NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "categories" (
  "id" integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  "name" character varying NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "clients" (
  "id" integer NOT NULL DEFAULT nextval('clients_id_seq'::regclass),
  "name" character varying NOT NULL,
  "cuit" character varying,
  "phone" character varying,
  "email" character varying,
  "address" character varying,
  "created_by_id" integer,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "provincia" character varying,
  "localidad" character varying,
  "zone_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "commission_payments" (
  "id" integer NOT NULL DEFAULT nextval('commission_payments_id_seq'::regclass),
  "seller_id" integer NOT NULL,
  "owner_id" integer,
  "amount" numeric NOT NULL,
  "date" timestamp(3) with time zone NOT NULL,
  "payment_method" enum_commission_payments_payment_method NOT NULL,
  "reference" character varying,
  "notes" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "entitlement_outbox" (
  "id" integer NOT NULL DEFAULT nextval('entitlement_outbox_id_seq'::regclass),
  "idempotency_key" character varying NOT NULL,
  "kind" character varying NOT NULL,
  "aggregate" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "state" enum_entitlement_outbox_state NOT NULL DEFAULT 'pending'::enum_entitlement_outbox_state,
  "attempts" numeric NOT NULL DEFAULT 0,
  "available_at" timestamp(3) with time zone NOT NULL,
  "claimed_at" timestamp(3) with time zone,
  "sent_at" timestamp(3) with time zone,
  "last_error" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "entitlement_quota_locks" (
  "id" integer NOT NULL DEFAULT nextval('entitlement_quota_locks_id_seq'::regclass),
  "tenant_id" integer NOT NULL,
  "nonce" numeric NOT NULL DEFAULT 0,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "invitations" (
  "id" integer NOT NULL DEFAULT nextval('invitations_id_seq'::regclass),
  "email" character varying NOT NULL,
  "role" enum_invitations_role NOT NULL,
  "token" character varying,
  "created_by_id" integer,
  "expires_at" timestamp(3) with time zone,
  "used_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "name" character varying NOT NULL,
  "state" enum_invitations_state NOT NULL DEFAULT 'pending'::enum_invitations_state,
  "accepted_user_id" integer,
  "cancelled_at" timestamp(3) with time zone,
  "replaced_at" timestamp(3) with time zone,
  "replaced_by_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "media" (
  "id" integer NOT NULL DEFAULT nextval('media_id_seq'::regclass),
  "alt" character varying NOT NULL,
  "_key" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "url" character varying,
  "thumbnail_u_r_l" character varying,
  "filename" character varying,
  "mime_type" character varying,
  "filesize" numeric,
  "width" numeric,
  "height" numeric,
  "focal_x" numeric,
  "focal_y" numeric,
  "tenant_id" integer,
  "upload_request_id" character varying,
  "staged_at" timestamp(3) with time zone,
  "claimed_at" timestamp(3) with time zone,
  "claimed_by_product_id" integer,
  "cleanup_after" timestamp(3) with time zone,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "mobile_seller_inventory" (
  "id" integer NOT NULL DEFAULT nextval('mobile_seller_inventory_id_seq'::regclass),
  "seller_id" integer NOT NULL,
  "variant_id" integer NOT NULL,
  "quantity" numeric NOT NULL DEFAULT 0,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
  "recipient_id" integer NOT NULL,
  "owner_id" integer NOT NULL,
  "type" enum_notifications_type NOT NULL,
  "title" character varying NOT NULL,
  "body" character varying NOT NULL,
  "metadata" jsonb,
  "read" boolean DEFAULT false,
  "read_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_kv" (
  "id" integer NOT NULL DEFAULT nextval('payload_kv_id_seq'::regclass),
  "key" character varying NOT NULL,
  "data" jsonb NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  "id" integer NOT NULL DEFAULT nextval('payload_locked_documents_id_seq'::regclass),
  "global_slug" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  "id" integer NOT NULL DEFAULT nextval('payload_locked_documents_rels_id_seq'::regclass),
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "users_id" integer,
  "media_id" integer,
  "invitations_id" integer,
  "brands_id" integer,
  "categories_id" integer,
  "qualities_id" integer,
  "presentations_id" integer,
  "products_id" integer,
  "product_variants_id" integer,
  "product_custom_fields_id" integer,
  "clients_id" integer,
  "settings_id" integer,
  "stock_movements_id" integer,
  "mobile_seller_inventory_id" integer,
  "sales_id" integer,
  "notifications_id" integer,
  "push_subscriptions_id" integer,
  "commission_payments_id" integer,
  "zones_id" integer,
  "budgets_id" integer,
  "plan_versions_id" integer,
  "tenant_entitlement_snapshots_id" integer,
  "entitlement_quota_locks_id" integer,
  "entitlement_outbox_id" integer,
  "sale_payments_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_migrations" (
  "id" integer NOT NULL DEFAULT nextval('payload_migrations_id_seq'::regclass),
  "name" character varying,
  "batch" numeric,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_preferences" (
  "id" integer NOT NULL DEFAULT nextval('payload_preferences_id_seq'::regclass),
  "key" character varying,
  "value" jsonb,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  "id" integer NOT NULL DEFAULT nextval('payload_preferences_rels_id_seq'::regclass),
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" character varying NOT NULL,
  "users_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "plan_versions" (
  "id" integer NOT NULL DEFAULT nextval('plan_versions_id_seq'::regclass),
  "plan_code" enum_plan_versions_plan_code NOT NULL,
  "version" numeric NOT NULL,
  "quotas_max_seller_seats" numeric NOT NULL,
  "quotas_max_products" numeric NOT NULL,
  "quotas_max_variants_per_product" numeric NOT NULL,
  "quotas_max_variants_per_tenant" numeric NOT NULL,
  "published_at" timestamp(3) with time zone NOT NULL,
  "created_by_id" integer NOT NULL,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "plan_versions_capabilities" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "capability" enum_plan_versions_capabilities_capability NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "presentations" (
  "id" integer NOT NULL DEFAULT nextval('presentations_id_seq'::regclass),
  "label" character varying NOT NULL,
  "amount" numeric NOT NULL,
  "unit" character varying NOT NULL,
  "product_id" integer,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "product_custom_fields" (
  "id" integer NOT NULL DEFAULT nextval('product_custom_fields_id_seq'::regclass),
  "name" character varying NOT NULL,
  "type" enum_product_custom_fields_type NOT NULL,
  "value" jsonb,
  "product_id" integer NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" integer NOT NULL DEFAULT nextval('product_variants_id_seq'::regclass),
  "code" character varying,
  "product_id" integer NOT NULL,
  "presentation_id" integer,
  "stock" numeric NOT NULL DEFAULT 0,
  "cost_price" numeric NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "profit_margin" numeric DEFAULT 0,
  "minimum_stock" numeric DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "products" (
  "id" integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  "name" character varying NOT NULL,
  "brand_id" integer,
  "category_id" integer,
  "quality_id" integer,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "description" character varying,
  "image_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" integer NOT NULL DEFAULT nextval('push_subscriptions_id_seq'::regclass),
  "user_id" integer NOT NULL,
  "endpoint" character varying NOT NULL,
  "p256dh" character varying NOT NULL,
  "auth" character varying NOT NULL,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "qualities" (
  "id" integer NOT NULL DEFAULT nextval('qualities_id_seq'::regclass),
  "name" character varying NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "sale_payments" (
  "id" integer NOT NULL DEFAULT nextval('sale_payments_id_seq'::regclass),
  "sale_id" integer NOT NULL,
  "seller_id" integer NOT NULL,
  "owner_id" integer,
  "amount" numeric NOT NULL,
  "date" timestamp(3) with time zone NOT NULL,
  "payment_method" enum_sale_payments_payment_method NOT NULL,
  "check_due_date" timestamp(3) with time zone,
  "registered_by_id" integer,
  "source" enum_sale_payments_source DEFAULT 'live'::enum_sale_payments_source,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "sales" (
  "id" integer NOT NULL DEFAULT nextval('sales_id_seq'::regclass),
  "seller_id" integer NOT NULL,
  "owner_id" integer NOT NULL,
  "client_id" integer,
  "date" timestamp(3) with time zone NOT NULL,
  "payment_method" enum_sales_payment_method,
  "total" numeric NOT NULL,
  "notes" character varying,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "amount_paid" numeric NOT NULL DEFAULT 0,
  "payment_status" enum_sales_payment_status NOT NULL DEFAULT 'pending'::enum_sales_payment_status,
  "collected_at" timestamp(3) with time zone,
  "check_due_date" timestamp(3) with time zone,
  "delivery_status" enum_sales_delivery_status NOT NULL DEFAULT 'pending'::enum_sales_delivery_status,
  "delivered_at" timestamp(3) with time zone,
  "source_budget_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "sales_items" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "variant_id" integer NOT NULL,
  "quantity" numeric NOT NULL,
  "unit_price" numeric NOT NULL,
  "stock_source" enum_sales_items_stock_source NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings" (
  "id" integer NOT NULL DEFAULT nextval('settings_id_seq'::regclass),
  "user_id" integer NOT NULL,
  "items_per_page" enum_settings_items_per_page DEFAULT '10'::enum_settings_items_per_page,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_assignments_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_budgets_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_clients_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_history_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_products_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_sales_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "settings_sellers_columns" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "column" character varying NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" integer NOT NULL DEFAULT nextval('stock_movements_id_seq'::regclass),
  "variant_id" integer NOT NULL,
  "type" enum_stock_movements_type NOT NULL,
  "quantity" numeric NOT NULL,
  "previous_stock" numeric NOT NULL,
  "new_stock" numeric NOT NULL,
  "reason" character varying,
  "owner_id" integer,
  "created_by_id" integer NOT NULL,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "mobile_seller_id" integer,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots" (
  "id" integer NOT NULL DEFAULT nextval('tenant_entitlement_snapshots_id_seq'::regclass),
  "tenant_id" integer NOT NULL,
  "sequence" numeric NOT NULL,
  "idempotency_key" character varying NOT NULL,
  "kind" enum_tenant_entitlement_snapshots_kind NOT NULL,
  "plan_version_id" integer,
  "quotas_max_seller_seats" numeric,
  "quotas_max_products" numeric,
  "quotas_max_variants_per_product" numeric,
  "quotas_max_variants_per_tenant" numeric,
  "predecessor_id" integer,
  "created_by_id" integer NOT NULL,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "invitation_id" integer NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities" (
  "_order" integer NOT NULL,
  "_parent_id" character varying NOT NULL,
  "id" character varying NOT NULL,
  "capability" tes_pending_grant_capability NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pool" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "capability" tes_pool_capability NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_user_grants" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "user_id" integer NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities" (
  "_order" integer NOT NULL,
  "_parent_id" character varying NOT NULL,
  "id" character varying NOT NULL,
  "capability" tes_user_grant_capability NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "users" (
  "id" integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "email" character varying NOT NULL,
  "reset_password_token" character varying,
  "reset_password_expiration" timestamp(3) with time zone,
  "salt" character varying,
  "hash" character varying,
  "login_attempts" numeric DEFAULT 0,
  "lock_until" timestamp(3) with time zone,
  "name" character varying NOT NULL,
  "role" enum_users_role NOT NULL DEFAULT 'seller'::enum_users_role,
  "owner_id" integer,
  "is_active" boolean DEFAULT true,
  "phone" character varying,
  "dni" character varying,
  "cuit_cuil" character varying,
  "cbu" character varying,
  "is_deleted" boolean DEFAULT false,
  "business_name" character varying,
  "business_cuit" character varying,
  "business_phone" character varying,
  "business_address" character varying,
  "iva_condition" enum_users_iva_condition,
  "active_entitlement_snapshot_id" integer,
  "entitlement_state" enum_users_entitlement_state,
  "timezone" enum_users_timezone DEFAULT 'America/Argentina/Buenos_Aires'::enum_users_timezone,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "users_sessions" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" character varying NOT NULL,
  "created_at" timestamp(3) with time zone,
  "expires_at" timestamp(3) with time zone NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "zones" (
  "id" integer NOT NULL DEFAULT nextval('zones_id_seq'::regclass),
  "name" character varying NOT NULL,
  "owner_id" integer,
  "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
`);

  // =================== FOREIGN KEYS ===================
  await db.execute(sql`DO \$\$ BEGIN
  ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "budgets" ADD CONSTRAINT "budgets_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "budgets_items" ADD CONSTRAINT "budgets_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "budgets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "budgets_items" ADD CONSTRAINT "budgets_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "entitlement_quota_locks" ADD CONSTRAINT "entitlement_quota_locks_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_replaced_by_id_invitations_id_fk" FOREIGN KEY ("replaced_by_id") REFERENCES "invitations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "media" ADD CONSTRAINT "media_claimed_by_product_id_products_id_fk" FOREIGN KEY ("claimed_by_product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "mobile_seller_inventory" ADD CONSTRAINT "mobile_seller_inventory_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "mobile_seller_inventory" ADD CONSTRAINT "mobile_seller_inventory_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "mobile_seller_inventory" ADD CONSTRAINT "mobile_seller_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_budgets_fk" FOREIGN KEY ("budgets_id") REFERENCES "budgets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clients_fk" FOREIGN KEY ("clients_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commission_payments_fk" FOREIGN KEY ("commission_payments_id") REFERENCES "commission_payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entitlement_outbox_fk" FOREIGN KEY ("entitlement_outbox_id") REFERENCES "entitlement_outbox"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entitlement_quota_locks_fk" FOREIGN KEY ("entitlement_quota_locks_id") REFERENCES "entitlement_quota_locks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitations_fk" FOREIGN KEY ("invitations_id") REFERENCES "invitations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mobile_seller_inventory_fk" FOREIGN KEY ("mobile_seller_inventory_id") REFERENCES "mobile_seller_inventory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_plan_versions_fk" FOREIGN KEY ("plan_versions_id") REFERENCES "plan_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_presentations_fk" FOREIGN KEY ("presentations_id") REFERENCES "presentations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_custom_fields_fk" FOREIGN KEY ("product_custom_fields_id") REFERENCES "product_custom_fields"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "product_variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk" FOREIGN KEY ("push_subscriptions_id") REFERENCES "push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_qualities_fk" FOREIGN KEY ("qualities_id") REFERENCES "qualities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sale_payments_fk" FOREIGN KEY ("sale_payments_id") REFERENCES "sale_payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sales_fk" FOREIGN KEY ("sales_id") REFERENCES "sales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_settings_fk" FOREIGN KEY ("settings_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_movements_fk" FOREIGN KEY ("stock_movements_id") REFERENCES "stock_movements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenant_entitlement_snapshot_fk" FOREIGN KEY ("tenant_entitlement_snapshots_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_zones_fk" FOREIGN KEY ("zones_id") REFERENCES "zones"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "plan_versions_capabilities" ADD CONSTRAINT "plan_versions_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "plan_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "presentations" ADD CONSTRAINT "presentations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "product_custom_fields" ADD CONSTRAINT "product_custom_fields_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "product_custom_fields" ADD CONSTRAINT "product_custom_fields_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "presentations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_quality_id_qualities_id_fk" FOREIGN KEY ("quality_id") REFERENCES "qualities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "qualities" ADD CONSTRAINT "qualities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_source_budget_id_budgets_id_fk" FOREIGN KEY ("source_budget_id") REFERENCES "budgets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "sales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_assignments_columns" ADD CONSTRAINT "settings_assignments_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_budgets_columns" ADD CONSTRAINT "settings_budgets_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_clients_columns" ADD CONSTRAINT "settings_clients_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_history_columns" ADD CONSTRAINT "settings_history_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_products_columns" ADD CONSTRAINT "settings_products_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_sales_columns" ADD CONSTRAINT "settings_sales_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "settings_sellers_columns" ADD CONSTRAINT "settings_sellers_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_mobile_seller_id_users_id_fk" FOREIGN KEY ("mobile_seller_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_plan_version_id_plan_versions_id_f" FOREIGN KEY ("plan_version_id") REFERENCES "plan_versions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_predecessor_id_tenant_entitlement_" FOREIGN KEY ("predecessor_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_pending_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_invitation_id_invit" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_pending_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_pending_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_capabilities_parent" FOREIGN KEY ("_parent_id") REFERENCES "tenant_entitlement_snapshots_pending_grants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_pool" ADD CONSTRAINT "tenant_entitlement_snapshots_pool_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_user_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_user_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "tenant_entitlement_snapshots_user_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_capabilities_parent_id" FOREIGN KEY ("_parent_id") REFERENCES "tenant_entitlement_snapshots_user_grants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_active_entitlement_snapshot_id_tenant_entitlement_snapsho" FOREIGN KEY ("active_entitlement_snapshot_id") REFERENCES "tenant_entitlement_snapshots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  ALTER TABLE "zones" ADD CONSTRAINT "zones_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
`);

  // =================== INDEXES ===================
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "brands_created_at_idx" ON "brands" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "brands_owner_idx" ON "brands" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "budgets_client_idx" ON "budgets" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "budgets_created_at_idx" ON "budgets" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "budgets_date_idx" ON "budgets" USING btree ("date");
CREATE INDEX IF NOT EXISTS "budgets_owner_idx" ON "budgets" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "budgets_seller_idx" ON "budgets" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "budgets_status_idx" ON "budgets" USING btree ("status");
CREATE INDEX IF NOT EXISTS "budgets_updated_at_idx" ON "budgets" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "budgets_items_order_idx" ON "budgets_items" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "budgets_items_parent_id_idx" ON "budgets_items" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "budgets_items_variant_idx" ON "budgets_items" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "categories_created_at_idx" ON "categories" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "categories_owner_idx" ON "categories" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "clients_created_at_idx" ON "clients" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "clients_created_by_idx" ON "clients" USING btree ("created_by_id");
CREATE INDEX IF NOT EXISTS "clients_owner_idx" ON "clients" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "clients_updated_at_idx" ON "clients" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "clients_zone_idx" ON "clients" USING btree ("zone_id");
CREATE INDEX IF NOT EXISTS "commission_payments_created_at_idx" ON "commission_payments" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "commission_payments_owner_idx" ON "commission_payments" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "commission_payments_seller_idx" ON "commission_payments" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "commission_payments_updated_at_idx" ON "commission_payments" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "entitlement_outbox_created_at_idx" ON "entitlement_outbox" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "entitlement_outbox_idempotency_key_idx" ON "entitlement_outbox" USING btree ("idempotency_key");
CREATE INDEX IF NOT EXISTS "entitlement_outbox_updated_at_idx" ON "entitlement_outbox" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "entitlement_quota_locks_created_at_idx" ON "entitlement_quota_locks" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "entitlement_quota_locks_tenant_idx" ON "entitlement_quota_locks" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "entitlement_quota_locks_updated_at_idx" ON "entitlement_quota_locks" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "invitations_accepted_user_idx" ON "invitations" USING btree ("accepted_user_id");
CREATE INDEX IF NOT EXISTS "invitations_created_at_idx" ON "invitations" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "invitations_created_by_idx" ON "invitations" USING btree ("created_by_id");
CREATE INDEX IF NOT EXISTS "invitations_replaced_by_idx" ON "invitations" USING btree ("replaced_by_id");
CREATE INDEX IF NOT EXISTS "invitations_state_idx" ON "invitations" USING btree ("state");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_idx" ON "invitations" USING btree ("token");
CREATE INDEX IF NOT EXISTS "invitations_updated_at_idx" ON "invitations" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "media_claimed_by_product_idx" ON "media" USING btree ("claimed_by_product_id");
CREATE INDEX IF NOT EXISTS "media_cleanup_after_idx" ON "media" USING btree ("cleanup_after");
CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
CREATE INDEX IF NOT EXISTS "media_tenant_idx" ON "media" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "mobile_seller_inventory_created_at_idx" ON "mobile_seller_inventory" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "mobile_seller_inventory_owner_idx" ON "mobile_seller_inventory" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "mobile_seller_inventory_seller_idx" ON "mobile_seller_inventory" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "mobile_seller_inventory_updated_at_idx" ON "mobile_seller_inventory" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "mobile_seller_inventory_variant_idx" ON "mobile_seller_inventory" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "notifications_owner_idx" ON "notifications" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");
CREATE INDEX IF NOT EXISTS "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_budgets_id_idx" ON "payload_locked_documents_rels" USING btree ("budgets_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("clients_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_commission_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("commission_payments_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_entitlement_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("entitlement_outbox_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_entitlement_quota_locks_id_idx" ON "payload_locked_documents_rels" USING btree ("entitlement_quota_locks_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("invitations_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_mobile_seller_inventory_id_idx" ON "payload_locked_documents_rels" USING btree ("mobile_seller_inventory_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_plan_versions_id_idx" ON "payload_locked_documents_rels" USING btree ("plan_versions_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_presentations_id_idx" ON "payload_locked_documents_rels" USING btree ("presentations_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_product_custom_fields_id_idx" ON "payload_locked_documents_rels" USING btree ("product_custom_fields_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_product_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("product_variants_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_push_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("push_subscriptions_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_qualities_id_idx" ON "payload_locked_documents_rels" USING btree ("qualities_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sale_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("sale_payments_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sales_id_idx" ON "payload_locked_documents_rels" USING btree ("sales_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("settings_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_stock_movements_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_movements_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tenant_entitlement_snapsho_idx" ON "payload_locked_documents_rels" USING btree ("tenant_entitlement_snapshots_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_zones_id_idx" ON "payload_locked_documents_rels" USING btree ("zones_id");
CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
CREATE INDEX IF NOT EXISTS "plan_versions_created_at_idx" ON "plan_versions" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "plan_versions_created_by_idx" ON "plan_versions" USING btree ("created_by_id");
CREATE INDEX IF NOT EXISTS "plan_versions_updated_at_idx" ON "plan_versions" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "plan_versions_capabilities_order_idx" ON "plan_versions_capabilities" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "plan_versions_capabilities_parent_id_idx" ON "plan_versions_capabilities" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "presentations_created_at_idx" ON "presentations" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "presentations_owner_idx" ON "presentations" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "presentations_product_idx" ON "presentations" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "presentations_updated_at_idx" ON "presentations" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "product_custom_fields_created_at_idx" ON "product_custom_fields" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "product_custom_fields_owner_idx" ON "product_custom_fields" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "product_custom_fields_product_idx" ON "product_custom_fields" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "product_custom_fields_updated_at_idx" ON "product_custom_fields" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "product_variants_created_at_idx" ON "product_variants" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "product_variants_owner_idx" ON "product_variants" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "product_variants_presentation_idx" ON "product_variants" USING btree ("presentation_id");
CREATE INDEX IF NOT EXISTS "product_variants_product_idx" ON "product_variants" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_updated_at_idx" ON "product_variants" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" USING btree ("brand_id");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "products_image_idx" ON "products" USING btree ("image_id");
CREATE INDEX IF NOT EXISTS "products_owner_idx" ON "products" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "products_quality_idx" ON "products" USING btree ("quality_id");
CREATE INDEX IF NOT EXISTS "products_updated_at_idx" ON "products" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "push_subscriptions_created_at_idx" ON "push_subscriptions" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "push_subscriptions_updated_at_idx" ON "push_subscriptions" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "qualities_created_at_idx" ON "qualities" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "qualities_owner_idx" ON "qualities" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "qualities_updated_at_idx" ON "qualities" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "sale_payments_created_at_idx" ON "sale_payments" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sale_payments_date_idx" ON "sale_payments" USING btree ("date");
CREATE INDEX IF NOT EXISTS "sale_payments_owner_idx" ON "sale_payments" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "sale_payments_registered_by_idx" ON "sale_payments" USING btree ("registered_by_id");
CREATE INDEX IF NOT EXISTS "sale_payments_sale_idx" ON "sale_payments" USING btree ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_payments_seller_idx" ON "sale_payments" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "sale_payments_updated_at_idx" ON "sale_payments" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "sales_client_idx" ON "sales" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "sales_created_at_idx" ON "sales" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sales_date_idx" ON "sales" USING btree ("date");
CREATE INDEX IF NOT EXISTS "sales_delivery_status_idx" ON "sales" USING btree ("delivery_status");
CREATE INDEX IF NOT EXISTS "sales_owner_idx" ON "sales" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "sales_payment_method_idx" ON "sales" USING btree ("payment_method");
CREATE INDEX IF NOT EXISTS "sales_payment_status_idx" ON "sales" USING btree ("payment_status");
CREATE INDEX IF NOT EXISTS "sales_seller_idx" ON "sales" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "sales_source_budget_idx" ON "sales" USING btree ("source_budget_id");
CREATE INDEX IF NOT EXISTS "sales_updated_at_idx" ON "sales" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "sales_items_order_idx" ON "sales_items" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "sales_items_parent_id_idx" ON "sales_items" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "sales_items_variant_idx" ON "sales_items" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "settings_created_at_idx" ON "settings" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "settings_updated_at_idx" ON "settings" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "settings_user_idx" ON "settings" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "settings_assignments_columns_order_idx" ON "settings_assignments_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_assignments_columns_parent_id_idx" ON "settings_assignments_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_budgets_columns_order_idx" ON "settings_budgets_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_budgets_columns_parent_id_idx" ON "settings_budgets_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_clients_columns_order_idx" ON "settings_clients_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_clients_columns_parent_id_idx" ON "settings_clients_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_history_columns_order_idx" ON "settings_history_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_history_columns_parent_id_idx" ON "settings_history_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_products_columns_order_idx" ON "settings_products_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_products_columns_parent_id_idx" ON "settings_products_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_sales_columns_order_idx" ON "settings_sales_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_sales_columns_parent_id_idx" ON "settings_sales_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "settings_sellers_columns_order_idx" ON "settings_sellers_columns" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "settings_sellers_columns_parent_id_idx" ON "settings_sellers_columns" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "stock_movements_created_by_idx" ON "stock_movements" USING btree ("created_by_id");
CREATE INDEX IF NOT EXISTS "stock_movements_mobile_seller_idx" ON "stock_movements" USING btree ("mobile_seller_id");
CREATE INDEX IF NOT EXISTS "stock_movements_owner_idx" ON "stock_movements" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements" USING btree ("type");
CREATE INDEX IF NOT EXISTS "stock_movements_updated_at_idx" ON "stock_movements" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "stock_movements_variant_idx" ON "stock_movements" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_created_at_idx" ON "tenant_entitlement_snapshots" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_created_by_idx" ON "tenant_entitlement_snapshots" USING btree ("created_by_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_plan_version_idx" ON "tenant_entitlement_snapshots" USING btree ("plan_version_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_predecessor_idx" ON "tenant_entitlement_snapshots" USING btree ("predecessor_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_tenant_idx" ON "tenant_entitlement_snapshots" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_updated_at_idx" ON "tenant_entitlement_snapshots" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_invitation_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("invitation_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_order_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_parent_id_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_order_" ON "tenant_entitlement_snapshots_pending_grants_capabilities" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_parent" ON "tenant_entitlement_snapshots_pending_grants_capabilities" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pool_order_idx" ON "tenant_entitlement_snapshots_pool" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pool_parent_id_idx" ON "tenant_entitlement_snapshots_pool" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_order_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_parent_id_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_user_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_order_idx" ON "tenant_entitlement_snapshots_user_grants_capabilities" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_parent_id" ON "tenant_entitlement_snapshots_user_grants_capabilities" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "users_active_entitlement_snapshot_idx" ON "users" USING btree ("active_entitlement_snapshot_id");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX IF NOT EXISTS "users_owner_idx" ON "users" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "zones_created_at_idx" ON "zones" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "zones_owner_idx" ON "zones" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "zones_updated_at_idx" ON "zones" USING btree ("updated_at");
`);

  // =================== TRIGGERS ===================
  await db.execute(sql`DO \$\$ BEGIN
  CREATE TRIGGER plan_versions_immutable_trigger BEFORE DELETE OR UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION prevent_plan_versions_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER plan_versions_capabilities_immutable_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.plan_versions_capabilities FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_immutable_trigger BEFORE DELETE OR UPDATE ON public.tenant_entitlement_snapshots FOR EACH ROW EXECUTE FUNCTION prevent_tenant_entitlement_snapshots_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_pending_grants_immutable_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.tenant_entitlement_snapshots_pending_grants FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_pending_grants_capabilities_immuta BEFORE INSERT OR DELETE OR UPDATE ON public.tenant_entitlement_snapshots_pending_grants_capabilities FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_pool_immutable_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.tenant_entitlement_snapshots_pool FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_user_grants_immutable_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.tenant_entitlement_snapshots_user_grants FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
DO \$\$ BEGIN
  CREATE TRIGGER tenant_entitlement_snapshots_user_grants_capabilities_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.tenant_entitlement_snapshots_user_grants_capabilities FOR EACH ROW EXECUTE FUNCTION prevent_entitlement_child_mutation();
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;
`);

  // =================== SCHEMA DRIFT REPAIR ===================
  await db.execute(sql`
-- enum_invitations_email_status: enum for invitations.emailStatus
DO \$\$ BEGIN
  CREATE TYPE "public"."enum_invitations_email_status" AS ENUM('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END \$\$;

-- invitations.businessName: text (nullable)
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS business_name text;

-- invitations.emailStatus: enum with NOT NULL DEFAULT 'pending'
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_status "public"."enum_invitations_email_status" NOT NULL DEFAULT 'pending';

-- tenant_entitlement_snapshots_plan_version_kind_idx: composite index
CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_plan_version_kind_idx"
  ON "tenant_entitlement_snapshots" USING btree ("plan_version_id", "kind");
`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // =================== ENUMS ===================
  await db.execute(sql`DROP TYPE IF EXISTS "public"."tes_user_grant_capability";
DROP TYPE IF EXISTS "public"."tes_pool_capability";
DROP TYPE IF EXISTS "public"."tes_pending_grant_capability";
DROP TYPE IF EXISTS "public"."enum_users_timezone";
DROP TYPE IF EXISTS "public"."enum_users_role";
DROP TYPE IF EXISTS "public"."enum_users_iva_condition";
DROP TYPE IF EXISTS "public"."enum_users_entitlement_state";
DROP TYPE IF EXISTS "public"."enum_tenant_entitlement_snapshots_kind";
DROP TYPE IF EXISTS "public"."enum_stock_movements_type";
DROP TYPE IF EXISTS "public"."enum_settings_items_per_page";
DROP TYPE IF EXISTS "public"."enum_sales_payment_status";
DROP TYPE IF EXISTS "public"."enum_sales_payment_method";
DROP TYPE IF EXISTS "public"."enum_sales_items_stock_source";
DROP TYPE IF EXISTS "public"."enum_sales_delivery_status";
DROP TYPE IF EXISTS "public"."enum_sale_payments_source";
DROP TYPE IF EXISTS "public"."enum_sale_payments_payment_method";
DROP TYPE IF EXISTS "public"."enum_product_custom_fields_type";
DROP TYPE IF EXISTS "public"."enum_plan_versions_plan_code";
DROP TYPE IF EXISTS "public"."enum_plan_versions_capabilities_capability";
DROP TYPE IF EXISTS "public"."enum_notifications_type";
DROP TYPE IF EXISTS "public"."enum_invitations_state";
DROP TYPE IF EXISTS "public"."enum_invitations_role";
DROP TYPE IF EXISTS "public"."enum_entitlement_outbox_state";
DROP TYPE IF EXISTS "public"."enum_commission_payments_payment_method";
DROP TYPE IF EXISTS "public"."enum_budgets_status";
`);

  // =================== SEQUENCES ===================
  await db.execute(sql`DROP SEQUENCE IF EXISTS "public"."zones_id_seq";
DROP SEQUENCE IF EXISTS "public"."users_id_seq";
DROP SEQUENCE IF EXISTS "public"."tenant_entitlement_snapshots_id_seq";
DROP SEQUENCE IF EXISTS "public"."stock_movements_id_seq";
DROP SEQUENCE IF EXISTS "public"."settings_id_seq";
DROP SEQUENCE IF EXISTS "public"."sales_id_seq";
DROP SEQUENCE IF EXISTS "public"."sale_payments_id_seq";
DROP SEQUENCE IF EXISTS "public"."qualities_id_seq";
DROP SEQUENCE IF EXISTS "public"."push_subscriptions_id_seq";
DROP SEQUENCE IF EXISTS "public"."products_id_seq";
DROP SEQUENCE IF EXISTS "public"."product_variants_id_seq";
DROP SEQUENCE IF EXISTS "public"."product_custom_fields_id_seq";
DROP SEQUENCE IF EXISTS "public"."presentations_id_seq";
DROP SEQUENCE IF EXISTS "public"."plan_versions_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_preferences_rels_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_preferences_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_migrations_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_locked_documents_rels_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_locked_documents_id_seq";
DROP SEQUENCE IF EXISTS "public"."payload_kv_id_seq";
DROP SEQUENCE IF EXISTS "public"."notifications_id_seq";
DROP SEQUENCE IF EXISTS "public"."mobile_seller_inventory_id_seq";
DROP SEQUENCE IF EXISTS "public"."media_id_seq";
DROP SEQUENCE IF EXISTS "public"."invitations_id_seq";
DROP SEQUENCE IF EXISTS "public"."entitlement_quota_locks_id_seq";
DROP SEQUENCE IF EXISTS "public"."entitlement_outbox_id_seq";
DROP SEQUENCE IF EXISTS "public"."commission_payments_id_seq";
DROP SEQUENCE IF EXISTS "public"."clients_id_seq";
DROP SEQUENCE IF EXISTS "public"."categories_id_seq";
DROP SEQUENCE IF EXISTS "public"."budgets_id_seq";
DROP SEQUENCE IF EXISTS "public"."brands_id_seq";
`);

  // =================== FUNCTIONS ===================
  await db.execute(sql`DROP FUNCTION IF EXISTS public.prevent_tenant_entitlement_snapshots_mutation();
DROP FUNCTION IF EXISTS public.prevent_plan_versions_mutation();
DROP FUNCTION IF EXISTS public.prevent_entitlement_child_mutation();
`);

  // =================== TABLES ===================
  await db.execute(sql`DROP TABLE IF EXISTS "zones" CASCADE;
DROP TABLE IF EXISTS "users_sessions" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots_user_grants_capabilities" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots_user_grants" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots_pool" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots_pending_grants" CASCADE;
DROP TABLE IF EXISTS "tenant_entitlement_snapshots" CASCADE;
DROP TABLE IF EXISTS "stock_movements" CASCADE;
DROP TABLE IF EXISTS "settings_sellers_columns" CASCADE;
DROP TABLE IF EXISTS "settings_sales_columns" CASCADE;
DROP TABLE IF EXISTS "settings_products_columns" CASCADE;
DROP TABLE IF EXISTS "settings_history_columns" CASCADE;
DROP TABLE IF EXISTS "settings_clients_columns" CASCADE;
DROP TABLE IF EXISTS "settings_budgets_columns" CASCADE;
DROP TABLE IF EXISTS "settings_assignments_columns" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;
DROP TABLE IF EXISTS "sales_items" CASCADE;
DROP TABLE IF EXISTS "sales" CASCADE;
DROP TABLE IF EXISTS "sale_payments" CASCADE;
DROP TABLE IF EXISTS "qualities" CASCADE;
DROP TABLE IF EXISTS "push_subscriptions" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "product_variants" CASCADE;
DROP TABLE IF EXISTS "product_custom_fields" CASCADE;
DROP TABLE IF EXISTS "presentations" CASCADE;
DROP TABLE IF EXISTS "plan_versions_capabilities" CASCADE;
DROP TABLE IF EXISTS "plan_versions" CASCADE;
DROP TABLE IF EXISTS "payload_preferences_rels" CASCADE;
DROP TABLE IF EXISTS "payload_preferences" CASCADE;
DROP TABLE IF EXISTS "payload_migrations" CASCADE;
DROP TABLE IF EXISTS "payload_locked_documents_rels" CASCADE;
DROP TABLE IF EXISTS "payload_locked_documents" CASCADE;
DROP TABLE IF EXISTS "payload_kv" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "mobile_seller_inventory" CASCADE;
DROP TABLE IF EXISTS "media" CASCADE;
DROP TABLE IF EXISTS "invitations" CASCADE;
DROP TABLE IF EXISTS "entitlement_quota_locks" CASCADE;
DROP TABLE IF EXISTS "entitlement_outbox" CASCADE;
DROP TABLE IF EXISTS "commission_payments" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "budgets_items" CASCADE;
DROP TABLE IF EXISTS "budgets" CASCADE;
DROP TABLE IF EXISTS "brands" CASCADE;
`);

  // =================== FOREIGN KEYS ===================
  await db.execute(sql`ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "brands_owner_id_users_id_fk";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_client_id_clients_id_fk";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_owner_id_users_id_fk";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_seller_id_users_id_fk";
ALTER TABLE "budgets_items" DROP CONSTRAINT IF EXISTS "budgets_items_parent_id_fk";
ALTER TABLE "budgets_items" DROP CONSTRAINT IF EXISTS "budgets_items_variant_id_product_variants_id_fk";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_owner_id_users_id_fk";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_created_by_id_users_id_fk";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_owner_id_users_id_fk";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_zone_id_zones_id_fk";
ALTER TABLE "commission_payments" DROP CONSTRAINT IF EXISTS "commission_payments_owner_id_users_id_fk";
ALTER TABLE "commission_payments" DROP CONSTRAINT IF EXISTS "commission_payments_seller_id_users_id_fk";
ALTER TABLE "entitlement_quota_locks" DROP CONSTRAINT IF EXISTS "entitlement_quota_locks_tenant_id_users_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_accepted_user_id_users_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_created_by_id_users_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_replaced_by_id_invitations_id_fk";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_claimed_by_product_id_products_id_fk";
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tenant_id_users_id_fk";
ALTER TABLE "mobile_seller_inventory" DROP CONSTRAINT IF EXISTS "mobile_seller_inventory_owner_id_users_id_fk";
ALTER TABLE "mobile_seller_inventory" DROP CONSTRAINT IF EXISTS "mobile_seller_inventory_seller_id_users_id_fk";
ALTER TABLE "mobile_seller_inventory" DROP CONSTRAINT IF EXISTS "mobile_seller_inventory_variant_id_product_variants_id_fk";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_owner_id_users_id_fk";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_recipient_id_users_id_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_brands_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_budgets_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_categories_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_clients_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_commission_payments_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_entitlement_outbox_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_entitlement_quota_locks_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_invitations_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_mobile_seller_inventory_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notifications_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_parent_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_plan_versions_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_presentations_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_product_custom_fields_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_product_variants_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_products_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_push_subscriptions_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_qualities_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sale_payments_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sales_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_settings_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_stock_movements_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_tenant_entitlement_snapshot_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_users_fk";
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_zones_fk";
ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_parent_fk";
ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_users_fk";
ALTER TABLE "plan_versions" DROP CONSTRAINT IF EXISTS "plan_versions_created_by_id_users_id_fk";
ALTER TABLE "plan_versions_capabilities" DROP CONSTRAINT IF EXISTS "plan_versions_capabilities_parent_id_fk";
ALTER TABLE "presentations" DROP CONSTRAINT IF EXISTS "presentations_owner_id_users_id_fk";
ALTER TABLE "presentations" DROP CONSTRAINT IF EXISTS "presentations_product_id_products_id_fk";
ALTER TABLE "product_custom_fields" DROP CONSTRAINT IF EXISTS "product_custom_fields_owner_id_users_id_fk";
ALTER TABLE "product_custom_fields" DROP CONSTRAINT IF EXISTS "product_custom_fields_product_id_products_id_fk";
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_owner_id_users_id_fk";
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_presentation_id_presentations_id_fk";
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_product_id_products_id_fk";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_brand_id_brands_id_fk";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_categories_id_fk";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_image_id_media_id_fk";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_owner_id_users_id_fk";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_quality_id_qualities_id_fk";
ALTER TABLE "push_subscriptions" DROP CONSTRAINT IF EXISTS "push_subscriptions_user_id_users_id_fk";
ALTER TABLE "qualities" DROP CONSTRAINT IF EXISTS "qualities_owner_id_users_id_fk";
ALTER TABLE "sale_payments" DROP CONSTRAINT IF EXISTS "sale_payments_owner_id_users_id_fk";
ALTER TABLE "sale_payments" DROP CONSTRAINT IF EXISTS "sale_payments_registered_by_id_users_id_fk";
ALTER TABLE "sale_payments" DROP CONSTRAINT IF EXISTS "sale_payments_sale_id_sales_id_fk";
ALTER TABLE "sale_payments" DROP CONSTRAINT IF EXISTS "sale_payments_seller_id_users_id_fk";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_client_id_clients_id_fk";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_owner_id_users_id_fk";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_seller_id_users_id_fk";
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_source_budget_id_budgets_id_fk";
ALTER TABLE "sales_items" DROP CONSTRAINT IF EXISTS "sales_items_parent_id_fk";
ALTER TABLE "sales_items" DROP CONSTRAINT IF EXISTS "sales_items_variant_id_product_variants_id_fk";
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_user_id_users_id_fk";
ALTER TABLE "settings_assignments_columns" DROP CONSTRAINT IF EXISTS "settings_assignments_columns_parent_id_fk";
ALTER TABLE "settings_budgets_columns" DROP CONSTRAINT IF EXISTS "settings_budgets_columns_parent_id_fk";
ALTER TABLE "settings_clients_columns" DROP CONSTRAINT IF EXISTS "settings_clients_columns_parent_id_fk";
ALTER TABLE "settings_history_columns" DROP CONSTRAINT IF EXISTS "settings_history_columns_parent_id_fk";
ALTER TABLE "settings_products_columns" DROP CONSTRAINT IF EXISTS "settings_products_columns_parent_id_fk";
ALTER TABLE "settings_sales_columns" DROP CONSTRAINT IF EXISTS "settings_sales_columns_parent_id_fk";
ALTER TABLE "settings_sellers_columns" DROP CONSTRAINT IF EXISTS "settings_sellers_columns_parent_id_fk";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_created_by_id_users_id_fk";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_mobile_seller_id_users_id_fk";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_owner_id_users_id_fk";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_variant_id_product_variants_id_fk";
ALTER TABLE "tenant_entitlement_snapshots" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_created_by_id_users_id_fk";
ALTER TABLE "tenant_entitlement_snapshots" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_plan_version_id_plan_versions_id_f";
ALTER TABLE "tenant_entitlement_snapshots" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_predecessor_id_tenant_entitlement_";
ALTER TABLE "tenant_entitlement_snapshots" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_tenant_id_users_id_fk";
ALTER TABLE "tenant_entitlement_snapshots_pending_grants" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_pending_grants_invitation_id_invit";
ALTER TABLE "tenant_entitlement_snapshots_pending_grants" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_pending_grants_parent_id_fk";
ALTER TABLE "tenant_entitlement_snapshots_pending_grants_capabilities" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_parent";
ALTER TABLE "tenant_entitlement_snapshots_pool" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_pool_parent_id_fk";
ALTER TABLE "tenant_entitlement_snapshots_user_grants" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_user_grants_parent_id_fk";
ALTER TABLE "tenant_entitlement_snapshots_user_grants" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_user_grants_user_id_users_id_fk";
ALTER TABLE "tenant_entitlement_snapshots_user_grants_capabilities" DROP CONSTRAINT IF EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_parent_id";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_active_entitlement_snapshot_id_tenant_entitlement_snapsho";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_owner_id_users_id_fk";
ALTER TABLE "users_sessions" DROP CONSTRAINT IF EXISTS "users_sessions_parent_id_fk";
ALTER TABLE "zones" DROP CONSTRAINT IF EXISTS "zones_owner_id_users_id_fk";
`);

  // =================== INDEXES ===================
  await db.execute(sql`DROP INDEX IF EXISTS "brands_created_at_idx";
DROP INDEX IF EXISTS "brands_owner_idx";
DROP INDEX IF EXISTS "brands_updated_at_idx";
DROP INDEX IF EXISTS "budgets_client_idx";
DROP INDEX IF EXISTS "budgets_created_at_idx";
DROP INDEX IF EXISTS "budgets_date_idx";
DROP INDEX IF EXISTS "budgets_owner_idx";
DROP INDEX IF EXISTS "budgets_seller_idx";
DROP INDEX IF EXISTS "budgets_status_idx";
DROP INDEX IF EXISTS "budgets_updated_at_idx";
DROP INDEX IF EXISTS "budgets_items_order_idx";
DROP INDEX IF EXISTS "budgets_items_parent_id_idx";
DROP INDEX IF EXISTS "budgets_items_variant_idx";
DROP INDEX IF EXISTS "categories_created_at_idx";
DROP INDEX IF EXISTS "categories_owner_idx";
DROP INDEX IF EXISTS "categories_updated_at_idx";
DROP INDEX IF EXISTS "clients_created_at_idx";
DROP INDEX IF EXISTS "clients_created_by_idx";
DROP INDEX IF EXISTS "clients_owner_idx";
DROP INDEX IF EXISTS "clients_updated_at_idx";
DROP INDEX IF EXISTS "clients_zone_idx";
DROP INDEX IF EXISTS "commission_payments_created_at_idx";
DROP INDEX IF EXISTS "commission_payments_owner_idx";
DROP INDEX IF EXISTS "commission_payments_seller_idx";
DROP INDEX IF EXISTS "commission_payments_updated_at_idx";
DROP INDEX IF EXISTS "entitlement_outbox_created_at_idx";
DROP INDEX IF EXISTS "entitlement_outbox_idempotency_key_idx";
DROP INDEX IF EXISTS "entitlement_outbox_updated_at_idx";
DROP INDEX IF EXISTS "entitlement_quota_locks_created_at_idx";
DROP INDEX IF EXISTS "entitlement_quota_locks_tenant_idx";
DROP INDEX IF EXISTS "entitlement_quota_locks_updated_at_idx";
DROP INDEX IF EXISTS "invitations_accepted_user_idx";
DROP INDEX IF EXISTS "invitations_created_at_idx";
DROP INDEX IF EXISTS "invitations_created_by_idx";
DROP INDEX IF EXISTS "invitations_replaced_by_idx";
DROP INDEX IF EXISTS "invitations_state_idx";
DROP INDEX IF EXISTS "invitations_token_idx";
DROP INDEX IF EXISTS "invitations_updated_at_idx";
DROP INDEX IF EXISTS "media_claimed_by_product_idx";
DROP INDEX IF EXISTS "media_cleanup_after_idx";
DROP INDEX IF EXISTS "media_created_at_idx";
DROP INDEX IF EXISTS "media_filename_idx";
DROP INDEX IF EXISTS "media_tenant_idx";
DROP INDEX IF EXISTS "media_updated_at_idx";
DROP INDEX IF EXISTS "mobile_seller_inventory_created_at_idx";
DROP INDEX IF EXISTS "mobile_seller_inventory_owner_idx";
DROP INDEX IF EXISTS "mobile_seller_inventory_seller_idx";
DROP INDEX IF EXISTS "mobile_seller_inventory_updated_at_idx";
DROP INDEX IF EXISTS "mobile_seller_inventory_variant_idx";
DROP INDEX IF EXISTS "notifications_created_at_idx";
DROP INDEX IF EXISTS "notifications_owner_idx";
DROP INDEX IF EXISTS "notifications_recipient_idx";
DROP INDEX IF EXISTS "notifications_updated_at_idx";
DROP INDEX IF EXISTS "payload_kv_key_idx";
DROP INDEX IF EXISTS "payload_locked_documents_created_at_idx";
DROP INDEX IF EXISTS "payload_locked_documents_global_slug_idx";
DROP INDEX IF EXISTS "payload_locked_documents_updated_at_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_brands_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_budgets_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_categories_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_clients_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_commission_payments_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_entitlement_outbox_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_entitlement_quota_locks_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_invitations_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_media_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_mobile_seller_inventory_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_notifications_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_order_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_parent_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_path_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_plan_versions_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_presentations_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_product_custom_fields_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_product_variants_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_products_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_push_subscriptions_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_qualities_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_sale_payments_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_sales_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_settings_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_stock_movements_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_tenant_entitlement_snapsho_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_users_id_idx";
DROP INDEX IF EXISTS "payload_locked_documents_rels_zones_id_idx";
DROP INDEX IF EXISTS "payload_migrations_created_at_idx";
DROP INDEX IF EXISTS "payload_migrations_updated_at_idx";
DROP INDEX IF EXISTS "payload_preferences_created_at_idx";
DROP INDEX IF EXISTS "payload_preferences_key_idx";
DROP INDEX IF EXISTS "payload_preferences_updated_at_idx";
DROP INDEX IF EXISTS "payload_preferences_rels_order_idx";
DROP INDEX IF EXISTS "payload_preferences_rels_parent_idx";
DROP INDEX IF EXISTS "payload_preferences_rels_path_idx";
DROP INDEX IF EXISTS "payload_preferences_rels_users_id_idx";
DROP INDEX IF EXISTS "plan_versions_created_at_idx";
DROP INDEX IF EXISTS "plan_versions_created_by_idx";
DROP INDEX IF EXISTS "plan_versions_updated_at_idx";
DROP INDEX IF EXISTS "plan_versions_capabilities_order_idx";
DROP INDEX IF EXISTS "plan_versions_capabilities_parent_id_idx";
DROP INDEX IF EXISTS "presentations_created_at_idx";
DROP INDEX IF EXISTS "presentations_owner_idx";
DROP INDEX IF EXISTS "presentations_product_idx";
DROP INDEX IF EXISTS "presentations_updated_at_idx";
DROP INDEX IF EXISTS "product_custom_fields_created_at_idx";
DROP INDEX IF EXISTS "product_custom_fields_owner_idx";
DROP INDEX IF EXISTS "product_custom_fields_product_idx";
DROP INDEX IF EXISTS "product_custom_fields_updated_at_idx";
DROP INDEX IF EXISTS "product_variants_created_at_idx";
DROP INDEX IF EXISTS "product_variants_owner_idx";
DROP INDEX IF EXISTS "product_variants_presentation_idx";
DROP INDEX IF EXISTS "product_variants_product_idx";
DROP INDEX IF EXISTS "product_variants_updated_at_idx";
DROP INDEX IF EXISTS "products_brand_idx";
DROP INDEX IF EXISTS "products_category_idx";
DROP INDEX IF EXISTS "products_created_at_idx";
DROP INDEX IF EXISTS "products_image_idx";
DROP INDEX IF EXISTS "products_owner_idx";
DROP INDEX IF EXISTS "products_quality_idx";
DROP INDEX IF EXISTS "products_updated_at_idx";
DROP INDEX IF EXISTS "push_subscriptions_created_at_idx";
DROP INDEX IF EXISTS "push_subscriptions_updated_at_idx";
DROP INDEX IF EXISTS "push_subscriptions_user_idx";
DROP INDEX IF EXISTS "qualities_created_at_idx";
DROP INDEX IF EXISTS "qualities_owner_idx";
DROP INDEX IF EXISTS "qualities_updated_at_idx";
DROP INDEX IF EXISTS "sale_payments_created_at_idx";
DROP INDEX IF EXISTS "sale_payments_date_idx";
DROP INDEX IF EXISTS "sale_payments_owner_idx";
DROP INDEX IF EXISTS "sale_payments_registered_by_idx";
DROP INDEX IF EXISTS "sale_payments_sale_idx";
DROP INDEX IF EXISTS "sale_payments_seller_idx";
DROP INDEX IF EXISTS "sale_payments_updated_at_idx";
DROP INDEX IF EXISTS "sales_client_idx";
DROP INDEX IF EXISTS "sales_created_at_idx";
DROP INDEX IF EXISTS "sales_date_idx";
DROP INDEX IF EXISTS "sales_delivery_status_idx";
DROP INDEX IF EXISTS "sales_owner_idx";
DROP INDEX IF EXISTS "sales_payment_method_idx";
DROP INDEX IF EXISTS "sales_payment_status_idx";
DROP INDEX IF EXISTS "sales_seller_idx";
DROP INDEX IF EXISTS "sales_source_budget_idx";
DROP INDEX IF EXISTS "sales_updated_at_idx";
DROP INDEX IF EXISTS "sales_items_order_idx";
DROP INDEX IF EXISTS "sales_items_parent_id_idx";
DROP INDEX IF EXISTS "sales_items_variant_idx";
DROP INDEX IF EXISTS "settings_created_at_idx";
DROP INDEX IF EXISTS "settings_updated_at_idx";
DROP INDEX IF EXISTS "settings_user_idx";
DROP INDEX IF EXISTS "settings_assignments_columns_order_idx";
DROP INDEX IF EXISTS "settings_assignments_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_budgets_columns_order_idx";
DROP INDEX IF EXISTS "settings_budgets_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_clients_columns_order_idx";
DROP INDEX IF EXISTS "settings_clients_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_history_columns_order_idx";
DROP INDEX IF EXISTS "settings_history_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_products_columns_order_idx";
DROP INDEX IF EXISTS "settings_products_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_sales_columns_order_idx";
DROP INDEX IF EXISTS "settings_sales_columns_parent_id_idx";
DROP INDEX IF EXISTS "settings_sellers_columns_order_idx";
DROP INDEX IF EXISTS "settings_sellers_columns_parent_id_idx";
DROP INDEX IF EXISTS "stock_movements_created_at_idx";
DROP INDEX IF EXISTS "stock_movements_created_by_idx";
DROP INDEX IF EXISTS "stock_movements_mobile_seller_idx";
DROP INDEX IF EXISTS "stock_movements_owner_idx";
DROP INDEX IF EXISTS "stock_movements_type_idx";
DROP INDEX IF EXISTS "stock_movements_updated_at_idx";
DROP INDEX IF EXISTS "stock_movements_variant_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_created_at_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_created_by_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_plan_version_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_predecessor_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_tenant_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_updated_at_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pending_grants_invitation_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pending_grants_order_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pending_grants_parent_id_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_order_";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_parent";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pool_order_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_pool_parent_id_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_user_grants_order_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_user_grants_parent_id_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_user_grants_user_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_order_idx";
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_parent_id";
DROP INDEX IF EXISTS "users_active_entitlement_snapshot_idx";
DROP INDEX IF EXISTS "users_created_at_idx";
DROP INDEX IF EXISTS "users_email_idx";
DROP INDEX IF EXISTS "users_owner_idx";
DROP INDEX IF EXISTS "users_updated_at_idx";
DROP INDEX IF EXISTS "users_sessions_order_idx";
DROP INDEX IF EXISTS "users_sessions_parent_id_idx";
DROP INDEX IF EXISTS "zones_created_at_idx";
DROP INDEX IF EXISTS "zones_owner_idx";
DROP INDEX IF EXISTS "zones_updated_at_idx";
`);

  // =================== TRIGGERS ===================
  await db.execute(sql`DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_user_grants_capabilities_immutable ON public.tenant_entitlement_snapshots_user_grants_capabilities;
DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_user_grants_immutable_trigger ON public.tenant_entitlement_snapshots_user_grants;
DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_pool_immutable_trigger ON public.tenant_entitlement_snapshots_pool;
DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_pending_grants_capabilities_immuta ON public.tenant_entitlement_snapshots_pending_grants_capabilities;
DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_pending_grants_immutable_trigger ON public.tenant_entitlement_snapshots_pending_grants;
DROP TRIGGER IF EXISTS tenant_entitlement_snapshots_immutable_trigger ON public.tenant_entitlement_snapshots;
DROP TRIGGER IF EXISTS plan_versions_capabilities_immutable_trigger ON public.plan_versions_capabilities;
DROP TRIGGER IF EXISTS plan_versions_immutable_trigger ON public.plan_versions;
`);

  // =================== DUPLICATE INVITATION PREVENTION ===================
  await db.execute(sql`
    UPDATE "invitations"
    SET "state" = 'cancelled'
    WHERE "state" = 'pending'
      AND "id" NOT IN (
        SELECT MIN("id")
        FROM "invitations"
        WHERE "state" = 'pending'
        GROUP BY "email", "created_by_id"
      );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "invitations_pending_email_owner_unique"
      ON "invitations" ("email", "created_by_id")
      WHERE "state" = 'pending';
  `);

  // =================== SCHEMA DRIFT REPAIR ===================
  await db.execute(sql`
DROP INDEX IF EXISTS "tenant_entitlement_snapshots_plan_version_kind_idx";
ALTER TABLE invitations DROP COLUMN IF EXISTS email_status;
ALTER TABLE invitations DROP COLUMN IF EXISTS business_name;
DROP TYPE IF EXISTS "public"."enum_invitations_email_status";
`);
}
