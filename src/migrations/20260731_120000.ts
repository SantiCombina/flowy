import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_plan_versions_plan_code" AS ENUM('basic', 'medium', 'professional');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_tenant_entitlement_snapshots_kind" AS ENUM('plan', 'custom');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_entitlement_outbox_state" AS ENUM('pending', 'processing', 'sent', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_entitlement_state" AS ENUM('provisioning', 'active', 'blocked');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_invitations_state" AS ENUM('pending', 'accepted', 'cancelled', 'replaced', 'expired');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "plan_versions" (
      "id" serial PRIMARY KEY NOT NULL,
      "plan_code" "enum_plan_versions_plan_code" NOT NULL,
      "version" integer NOT NULL,
      "quotas_max_seller_seats" numeric NOT NULL,
      "quotas_max_products" numeric NOT NULL,
      "quotas_max_variants_per_product" numeric NOT NULL,
      "quotas_max_variants_per_tenant" numeric NOT NULL,
      "published_at" timestamp(3) with time zone NOT NULL,
      "created_by_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "plan_versions_capabilities" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "capability" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer NOT NULL,
      "sequence" integer NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "kind" "enum_tenant_entitlement_snapshots_kind" NOT NULL,
      "plan_version_id" integer,
      "quotas_max_seller_seats" numeric,
      "quotas_max_products" numeric,
      "quotas_max_variants_per_product" numeric,
      "quotas_max_variants_per_tenant" numeric,
      "predecessor_id" integer,
      "created_by_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pool" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "capability" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_user_grants" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "capability" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "invitation_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "capability" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "entitlement_quota_locks" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer NOT NULL,
      "nonce" numeric DEFAULT 0 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "entitlement_outbox" (
      "id" serial PRIMARY KEY NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "kind" varchar NOT NULL,
      "aggregate" varchar NOT NULL,
      "payload" jsonb NOT NULL,
      "state" "enum_entitlement_outbox_state" DEFAULT 'pending' NOT NULL,
      "attempts" numeric DEFAULT 0 NOT NULL,
      "available_at" timestamp(3) with time zone NOT NULL,
      "claimed_at" timestamp(3) with time zone,
      "sent_at" timestamp(3) with time zone,
      "last_error" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_entitlement_snapshot_id" integer;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "entitlement_state" "enum_users_entitlement_state" DEFAULT 'provisioning';
    ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "state" "enum_invitations_state" DEFAULT 'pending';
    ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "accepted_user_id" integer;
    ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp(3) with time zone;
    ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "replaced_at" timestamp(3) with time zone;
    ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "replaced_by_id" integer;
    UPDATE "invitations"
    SET "state" = 'accepted'::"enum_invitations_state"
    WHERE "used_at" IS NOT NULL;
    UPDATE "invitations"
    SET "accepted_user_id" = "legacy_users"."user_id"
    FROM (
      SELECT min("invitation_candidates"."invitation_id") AS "invitation_id", "invitation_candidates"."user_id"
      FROM (
        SELECT "invitations"."id" AS "invitation_id", min("users"."id") AS "user_id"
        FROM "invitations"
        JOIN "users" ON lower(btrim("users"."email")) = lower(btrim("invitations"."email"))
          AND (
            ("invitations"."role" = 'seller' AND "users"."role" = 'seller' AND "users"."owner_id" = "invitations"."created_by_id")
            OR ("invitations"."role" = 'owner' AND "users"."role" = 'owner' AND "users"."owner_id" IS NULL)
          )
        WHERE "invitations"."used_at" IS NOT NULL
        GROUP BY "invitations"."id"
        HAVING count("users"."id") = 1
      ) AS "invitation_candidates"
      GROUP BY "invitation_candidates"."user_id"
      HAVING count(*) = 1
    ) AS "legacy_users"
    WHERE "invitations"."id" = "legacy_users"."invitation_id";
    ALTER TABLE "invitations" ALTER COLUMN "state" SET NOT NULL;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "upload_request_id" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "staged_at" timestamp(3) with time zone;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "claimed_at" timestamp(3) with time zone;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "claimed_by_product_id" integer;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "cleanup_after" timestamp(3) with time zone;
    UPDATE "media"
    SET "tenant_id" = "legacy_media_owners"."owner_id"
    FROM (
      SELECT "products"."image_id" AS "media_id", min("products"."owner_id") AS "owner_id"
      FROM "products"
      WHERE "products"."image_id" IS NOT NULL
      GROUP BY "products"."image_id"
      HAVING count(DISTINCT "products"."owner_id") = 1
    ) AS "legacy_media_owners"
    WHERE "media"."id" = "legacy_media_owners"."media_id"
      AND "media"."tenant_id" IS NULL;

    DO $$
    DECLARE
      orphan_count integer;
    BEGIN
      SELECT count(*) INTO orphan_count
      FROM "media"
      WHERE "tenant_id" IS NULL;

      IF orphan_count > 0 THEN
        RAISE NOTICE 'Migración de media: % registros quedaron sin tenant asignado. Revisar y asignar manualmente.', orphan_count;
      END IF;
    END $$;
    ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "source_budget_id" integer;

    DO $$ BEGIN
      ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "plan_versions_capabilities" ADD CONSTRAINT "plan_versions_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."plan_versions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_predecessor_id_tenant_entitlement_snapshots_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."tenant_entitlement_snapshots"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_pool" ADD CONSTRAINT "tenant_entitlement_snapshots_pool_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_user_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_user_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_user_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenant_entitlement_snapshots_user_grants"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_pending_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenant_entitlement_snapshots"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_pending_grants" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "tenant_entitlement_snapshots_pending_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenant_entitlement_snapshots_pending_grants"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "entitlement_quota_locks" ADD CONSTRAINT "entitlement_quota_locks_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "users" ADD CONSTRAINT "users_active_entitlement_snapshot_id_tenant_entitlement_snapshots_id_fk" FOREIGN KEY ("active_entitlement_snapshot_id") REFERENCES "public"."tenant_entitlement_snapshots"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "invitations" ADD CONSTRAINT "invitations_replaced_by_id_invitations_id_fk" FOREIGN KEY ("replaced_by_id") REFERENCES "public"."invitations"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_users_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "media" ADD CONSTRAINT "media_claimed_by_product_id_products_id_fk" FOREIGN KEY ("claimed_by_product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "sales" ADD CONSTRAINT "sales_source_budget_id_budgets_id_fk" FOREIGN KEY ("source_budget_id") REFERENCES "public"."budgets"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "tenant_entitlement_snapshots" ADD CONSTRAINT "tenant_entitlement_snapshots_kind_shape_check" CHECK (
      ("kind" = 'plan' AND "plan_version_id" IS NOT NULL AND "quotas_max_seller_seats" IS NULL AND "quotas_max_products" IS NULL AND "quotas_max_variants_per_product" IS NULL AND "quotas_max_variants_per_tenant" IS NULL)
      OR
      ("kind" = 'custom' AND "plan_version_id" IS NULL AND "quotas_max_seller_seats" IS NOT NULL AND "quotas_max_products" IS NOT NULL AND "quotas_max_variants_per_product" IS NOT NULL AND "quotas_max_variants_per_tenant" IS NOT NULL)
    );
    ALTER TABLE "plan_versions_capabilities" ADD CONSTRAINT "plan_versions_capabilities_canonical_check" CHECK ("capability" IN ('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read'));
    ALTER TABLE "tenant_entitlement_snapshots_pool" ADD CONSTRAINT "tenant_entitlement_snapshots_pool_canonical_check" CHECK ("capability" IN ('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read'));
    ALTER TABLE "tenant_entitlement_snapshots_user_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_user_grants_capabilities_canonical_check" CHECK ("capability" IN ('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read'));
    ALTER TABLE "tenant_entitlement_snapshots_pending_grants_capabilities" ADD CONSTRAINT "tenant_entitlement_snapshots_pending_grants_capabilities_canonical_check" CHECK ("capability" IN ('catalog.manage', 'warehouse.stock', 'warehouse.history', 'client.read', 'client.manage', 'client.contact-fields', 'client.delete', 'zones.manage', 'budget.manage', 'budget.recipient-phone', 'sale.create', 'sale.credit', 'sale.collect', 'seller.manage', 'seller.invite', 'inventory.mobile', 'inventory.assignment', 'commission.manage', 'dashboard.owner', 'dashboard.seller', 'notification.read'));
    ALTER TABLE "invitations" ADD CONSTRAINT "invitations_lifecycle_shape_check" CHECK (
      ("state" = 'pending' AND "accepted_user_id" IS NULL AND "used_at" IS NULL AND "cancelled_at" IS NULL AND "replaced_at" IS NULL AND "replaced_by_id" IS NULL)
      OR ("state" = 'accepted' AND "used_at" IS NOT NULL AND "cancelled_at" IS NULL AND "replaced_at" IS NULL AND "replaced_by_id" IS NULL)
      OR ("state" = 'cancelled' AND "accepted_user_id" IS NULL AND "used_at" IS NULL AND "cancelled_at" IS NOT NULL AND "replaced_at" IS NULL AND "replaced_by_id" IS NULL)
      OR ("state" = 'replaced' AND "accepted_user_id" IS NULL AND "used_at" IS NULL AND "cancelled_at" IS NULL AND "replaced_at" IS NOT NULL AND "replaced_by_id" IS NOT NULL)
      OR ("state" = 'expired' AND "accepted_user_id" IS NULL AND "used_at" IS NULL AND "cancelled_at" IS NULL AND "replaced_at" IS NULL AND "replaced_by_id" IS NULL)
    );

    CREATE FUNCTION "prevent_plan_versions_mutation"() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'Plan versions are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER "plan_versions_immutable_trigger" BEFORE UPDATE OR DELETE ON "plan_versions" FOR EACH ROW EXECUTE FUNCTION "prevent_plan_versions_mutation"();
    CREATE FUNCTION "prevent_tenant_entitlement_snapshots_mutation"() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'Tenant entitlement snapshots are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER "tenant_entitlement_snapshots_immutable_trigger" BEFORE UPDATE OR DELETE ON "tenant_entitlement_snapshots" FOR EACH ROW EXECUTE FUNCTION "prevent_tenant_entitlement_snapshots_mutation"();
    CREATE FUNCTION "prevent_entitlement_child_mutation"() RETURNS trigger AS $$
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
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER "plan_versions_capabilities_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "plan_versions_capabilities" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();
    CREATE TRIGGER "tenant_entitlement_snapshots_pool_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "tenant_entitlement_snapshots_pool" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();
    CREATE TRIGGER "tenant_entitlement_snapshots_user_grants_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "tenant_entitlement_snapshots_user_grants" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();
    CREATE TRIGGER "tenant_entitlement_snapshots_user_grants_capabilities_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "tenant_entitlement_snapshots_user_grants_capabilities" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();
    CREATE TRIGGER "tenant_entitlement_snapshots_pending_grants_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "tenant_entitlement_snapshots_pending_grants" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();
    CREATE TRIGGER "tenant_entitlement_snapshots_pending_grants_capabilities_immutable_trigger" BEFORE INSERT OR UPDATE OR DELETE ON "tenant_entitlement_snapshots_pending_grants_capabilities" FOR EACH ROW EXECUTE FUNCTION "prevent_entitlement_child_mutation"();

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "product_variants" WHERE "presentation_id" IS NOT NULL GROUP BY "product_id", "presentation_id" HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Cannot create product presentation uniqueness index while duplicates exist';
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "plan_versions_plan_code_version_idx" ON "plan_versions" USING btree ("plan_code", "version");
    CREATE INDEX IF NOT EXISTS "plan_versions_created_by_idx" ON "plan_versions" USING btree ("created_by_id");
    CREATE INDEX IF NOT EXISTS "plan_versions_updated_at_idx" ON "plan_versions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "plan_versions_created_at_idx" ON "plan_versions" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "plan_versions_capabilities_order_idx" ON "plan_versions_capabilities" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "plan_versions_capabilities_parent_id_idx" ON "plan_versions_capabilities" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_tenant_sequence_idx" ON "tenant_entitlement_snapshots" USING btree ("tenant_id", "sequence");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_tenant_idempotency_key_idx" ON "tenant_entitlement_snapshots" USING btree ("tenant_id", "idempotency_key");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_tenant_idx" ON "tenant_entitlement_snapshots" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_plan_version_idx" ON "tenant_entitlement_snapshots" USING btree ("plan_version_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_predecessor_idx" ON "tenant_entitlement_snapshots" USING btree ("predecessor_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_created_by_idx" ON "tenant_entitlement_snapshots" USING btree ("created_by_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_updated_at_idx" ON "tenant_entitlement_snapshots" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_created_at_idx" ON "tenant_entitlement_snapshots" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pool_order_idx" ON "tenant_entitlement_snapshots_pool" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pool_parent_id_idx" ON "tenant_entitlement_snapshots_pool" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_order_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_parent_id_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_user_idx" ON "tenant_entitlement_snapshots_user_grants" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_order_idx" ON "tenant_entitlement_snapshots_user_grants_capabilities" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_user_grants_capabilities_parent_id_idx" ON "tenant_entitlement_snapshots_user_grants_capabilities" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_order_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_parent_id_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_invitation_idx" ON "tenant_entitlement_snapshots_pending_grants" USING btree ("invitation_id");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_order_idx" ON "tenant_entitlement_snapshots_pending_grants_capabilities" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tenant_entitlement_snapshots_pending_grants_capabilities_parent_id_idx" ON "tenant_entitlement_snapshots_pending_grants_capabilities" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "entitlement_quota_locks_tenant_idx" ON "entitlement_quota_locks" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "entitlement_quota_locks_updated_at_idx" ON "entitlement_quota_locks" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "entitlement_quota_locks_created_at_idx" ON "entitlement_quota_locks" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "entitlement_outbox_idempotency_key_idx" ON "entitlement_outbox" USING btree ("idempotency_key");
    CREATE INDEX IF NOT EXISTS "entitlement_outbox_claim_idx" ON "entitlement_outbox" USING btree ("state", "available_at");
    CREATE INDEX IF NOT EXISTS "entitlement_outbox_updated_at_idx" ON "entitlement_outbox" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "entitlement_outbox_created_at_idx" ON "entitlement_outbox" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "users_active_entitlement_snapshot_idx" ON "users" USING btree ("active_entitlement_snapshot_id");
    CREATE INDEX IF NOT EXISTS "invitations_creator_email_state_expiry_idx" ON "invitations" USING btree ("created_by_id", lower("email"), "state", "expires_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "invitations_accepted_user_idx" ON "invitations" USING btree ("accepted_user_id") WHERE "accepted_user_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "media_tenant_idx" ON "media" USING btree ("tenant_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "media_tenant_upload_request_idx" ON "media" USING btree ("tenant_id", "upload_request_id") WHERE "upload_request_id" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "media_cleanup_after_idx" ON "media" USING btree ("cleanup_after");
    CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_product_presentation_idx" ON "product_variants" USING btree ("product_id", "presentation_id") WHERE "presentation_id" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "sales_source_budget_idx" ON "sales" USING btree ("source_budget_id") WHERE "source_budget_id" IS NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "plan_versions")
        OR EXISTS (SELECT 1 FROM "tenant_entitlement_snapshots")
        OR EXISTS (SELECT 1 FROM "entitlement_quota_locks")
        OR EXISTS (SELECT 1 FROM "entitlement_outbox")
        OR EXISTS (SELECT 1 FROM "users" WHERE "active_entitlement_snapshot_id" IS NOT NULL OR "entitlement_state" <> 'provisioning')
        OR EXISTS (SELECT 1 FROM "invitations" WHERE "state" IN ('cancelled', 'replaced', 'expired'))
        OR EXISTS (SELECT 1 FROM "invitations" WHERE "state" = 'pending' AND ("used_at" IS NOT NULL OR "accepted_user_id" IS NOT NULL OR "cancelled_at" IS NOT NULL OR "replaced_at" IS NOT NULL OR "replaced_by_id" IS NOT NULL))
        OR EXISTS (
          SELECT 1
          FROM "invitations"
          LEFT JOIN "users" ON "users"."id" = "invitations"."accepted_user_id"
            AND lower(btrim("users"."email")) = lower(btrim("invitations"."email"))
            AND (
              ("invitations"."role" = 'seller' AND "users"."role" = 'seller' AND "users"."owner_id" = "invitations"."created_by_id")
              OR ("invitations"."role" = 'owner' AND "users"."role" = 'owner' AND "users"."owner_id" IS NULL)
            )
          WHERE "invitations"."state" = 'accepted'
          GROUP BY "invitations"."id", "invitations"."used_at", "invitations"."accepted_user_id"
          HAVING "invitations"."used_at" IS NULL OR "invitations"."accepted_user_id" IS NULL OR count("users"."id") <> 1
        )
        OR EXISTS (SELECT 1 FROM "media" WHERE "upload_request_id" IS NOT NULL OR "staged_at" IS NOT NULL OR "claimed_at" IS NOT NULL OR "claimed_by_product_id" IS NOT NULL OR "cleanup_after" IS NOT NULL)
        OR EXISTS (
          SELECT 1
          FROM "media"
          LEFT JOIN (
            SELECT "products"."image_id" AS "media_id", min("products"."owner_id") AS "owner_id", count(DISTINCT "products"."owner_id") AS "owner_count"
            FROM "products"
            WHERE "products"."image_id" IS NOT NULL
            GROUP BY "products"."image_id"
          ) AS "legacy_media_owners" ON "legacy_media_owners"."media_id" = "media"."id"
          WHERE "legacy_media_owners"."owner_count" <> 1
            OR "legacy_media_owners"."owner_id" IS NULL
            OR "legacy_media_owners"."owner_id" <> "media"."tenant_id"
        )
        OR EXISTS (SELECT 1 FROM "sales" WHERE "source_budget_id" IS NOT NULL) THEN
        RAISE EXCEPTION 'Refusing destructive entitlement rollback; only migration-derived accepted invitation rows are compatible';
      END IF;
    END $$;

    DROP INDEX "sales_source_budget_idx";
    DROP INDEX "product_variants_product_presentation_idx";
    DROP INDEX "media_cleanup_after_idx";
    DROP INDEX "media_tenant_upload_request_idx";
    DROP INDEX "media_tenant_idx";
    DROP INDEX "invitations_accepted_user_idx";
    DROP INDEX "invitations_creator_email_state_expiry_idx";
    DROP INDEX "users_active_entitlement_snapshot_idx";
    DROP INDEX "entitlement_outbox_created_at_idx";
    DROP INDEX "entitlement_outbox_updated_at_idx";
    DROP INDEX "entitlement_outbox_claim_idx";
    DROP INDEX "entitlement_outbox_idempotency_key_idx";
    DROP INDEX "entitlement_quota_locks_created_at_idx";
    DROP INDEX "entitlement_quota_locks_updated_at_idx";
    DROP INDEX "entitlement_quota_locks_tenant_idx";
    DROP INDEX "tenant_entitlement_snapshots_pending_grants_capabilities_parent_id_idx";
    DROP INDEX "tenant_entitlement_snapshots_pending_grants_capabilities_order_idx";
    DROP INDEX "tenant_entitlement_snapshots_pending_grants_invitation_idx";
    DROP INDEX "tenant_entitlement_snapshots_pending_grants_parent_id_idx";
    DROP INDEX "tenant_entitlement_snapshots_pending_grants_order_idx";
    DROP INDEX "tenant_entitlement_snapshots_user_grants_capabilities_parent_id_idx";
    DROP INDEX "tenant_entitlement_snapshots_user_grants_capabilities_order_idx";
    DROP INDEX "tenant_entitlement_snapshots_user_grants_user_idx";
    DROP INDEX "tenant_entitlement_snapshots_user_grants_parent_id_idx";
    DROP INDEX "tenant_entitlement_snapshots_user_grants_order_idx";
    DROP INDEX "tenant_entitlement_snapshots_pool_parent_id_idx";
    DROP INDEX "tenant_entitlement_snapshots_pool_order_idx";
    DROP INDEX "tenant_entitlement_snapshots_created_at_idx";
    DROP INDEX "tenant_entitlement_snapshots_updated_at_idx";
    DROP INDEX "tenant_entitlement_snapshots_created_by_idx";
    DROP INDEX "tenant_entitlement_snapshots_predecessor_idx";
    DROP INDEX "tenant_entitlement_snapshots_plan_version_idx";
    DROP INDEX "tenant_entitlement_snapshots_tenant_idx";
    DROP INDEX "tenant_entitlement_snapshots_tenant_idempotency_key_idx";
    DROP INDEX "tenant_entitlement_snapshots_tenant_sequence_idx";
    DROP INDEX "plan_versions_capabilities_parent_id_idx";
    DROP INDEX "plan_versions_capabilities_order_idx";
    DROP INDEX "plan_versions_created_at_idx";
    DROP INDEX "plan_versions_updated_at_idx";
    DROP INDEX "plan_versions_created_by_idx";
    DROP INDEX "plan_versions_plan_code_version_idx";

    ALTER TABLE "sales" DROP CONSTRAINT "sales_source_budget_id_budgets_id_fk";
    ALTER TABLE "media" DROP CONSTRAINT "media_claimed_by_product_id_products_id_fk";
    ALTER TABLE "media" DROP CONSTRAINT "media_tenant_id_users_id_fk";
    ALTER TABLE "invitations" DROP CONSTRAINT "invitations_replaced_by_id_invitations_id_fk";
    ALTER TABLE "invitations" DROP CONSTRAINT "invitations_accepted_user_id_users_id_fk";
    ALTER TABLE "users" DROP CONSTRAINT "users_active_entitlement_snapshot_id_tenant_entitlement_snapshots_id_fk";
    ALTER TABLE "tenant_entitlement_snapshots" DROP CONSTRAINT "tenant_entitlement_snapshots_kind_shape_check";
    ALTER TABLE "invitations" DROP CONSTRAINT "invitations_lifecycle_shape_check";
    ALTER TABLE "tenant_entitlement_snapshots_pending_grants_capabilities" DROP CONSTRAINT "tenant_entitlement_snapshots_pending_grants_capabilities_canonical_check";
    ALTER TABLE "tenant_entitlement_snapshots_user_grants_capabilities" DROP CONSTRAINT "tenant_entitlement_snapshots_user_grants_capabilities_canonical_check";
    ALTER TABLE "tenant_entitlement_snapshots_pool" DROP CONSTRAINT "tenant_entitlement_snapshots_pool_canonical_check";
    ALTER TABLE "plan_versions_capabilities" DROP CONSTRAINT "plan_versions_capabilities_canonical_check";
    DROP TRIGGER "tenant_entitlement_snapshots_immutable_trigger" ON "tenant_entitlement_snapshots";
    DROP FUNCTION "prevent_tenant_entitlement_snapshots_mutation"();
    DROP TRIGGER "plan_versions_immutable_trigger" ON "plan_versions";
    DROP FUNCTION "prevent_plan_versions_mutation"();
    DROP TRIGGER "tenant_entitlement_snapshots_pending_grants_capabilities_immutable_trigger" ON "tenant_entitlement_snapshots_pending_grants_capabilities";
    DROP TRIGGER "tenant_entitlement_snapshots_pending_grants_immutable_trigger" ON "tenant_entitlement_snapshots_pending_grants";
    DROP TRIGGER "tenant_entitlement_snapshots_user_grants_capabilities_immutable_trigger" ON "tenant_entitlement_snapshots_user_grants_capabilities";
    DROP TRIGGER "tenant_entitlement_snapshots_user_grants_immutable_trigger" ON "tenant_entitlement_snapshots_user_grants";
    DROP TRIGGER "tenant_entitlement_snapshots_pool_immutable_trigger" ON "tenant_entitlement_snapshots_pool";
    DROP TRIGGER "plan_versions_capabilities_immutable_trigger" ON "plan_versions_capabilities";
    DROP FUNCTION "prevent_entitlement_child_mutation"();
    DROP TABLE "entitlement_outbox";
    DROP TABLE "entitlement_quota_locks";
    DROP TABLE "tenant_entitlement_snapshots_pending_grants_capabilities";
    DROP TABLE "tenant_entitlement_snapshots_pending_grants";
    DROP TABLE "tenant_entitlement_snapshots_user_grants_capabilities";
    DROP TABLE "tenant_entitlement_snapshots_user_grants";
    DROP TABLE "tenant_entitlement_snapshots_pool";
    DROP TABLE "tenant_entitlement_snapshots";
    DROP TABLE "plan_versions_capabilities";
    DROP TABLE "plan_versions";

    ALTER TABLE "sales" DROP COLUMN "source_budget_id";
    ALTER TABLE "media" DROP COLUMN "cleanup_after";
    ALTER TABLE "media" DROP COLUMN "claimed_by_product_id";
    ALTER TABLE "media" DROP COLUMN "claimed_at";
    ALTER TABLE "media" DROP COLUMN "staged_at";
    ALTER TABLE "media" DROP COLUMN "upload_request_id";
    ALTER TABLE "media" DROP COLUMN "tenant_id";
    ALTER TABLE "invitations" DROP COLUMN "replaced_by_id";
    ALTER TABLE "invitations" DROP COLUMN "replaced_at";
    ALTER TABLE "invitations" DROP COLUMN "cancelled_at";
    ALTER TABLE "invitations" DROP COLUMN "accepted_user_id";
    ALTER TABLE "invitations" DROP COLUMN "state";
    ALTER TABLE "users" DROP COLUMN "entitlement_state";
    ALTER TABLE "users" DROP COLUMN "active_entitlement_snapshot_id";

    DROP TYPE "public"."enum_invitations_state";
    DROP TYPE "public"."enum_users_entitlement_state";
    DROP TYPE "public"."enum_entitlement_outbox_state";
    DROP TYPE "public"."enum_tenant_entitlement_snapshots_kind";
    DROP TYPE "public"."enum_plan_versions_plan_code";
  `);
}
