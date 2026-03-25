import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_notifications_type" AS ENUM(
        'sale_created', 'payment_registered', 'stock_dispatched',
        'stock_returned', 'stock_low', 'stock_adjusted'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "recipient_id" integer NOT NULL,
      "owner_id" integer NOT NULL,
      "type" "public"."enum_notifications_type" NOT NULL,
      "title" varchar NOT NULL,
      "body" varchar NOT NULL,
      "metadata" jsonb,
      "read" boolean DEFAULT false NOT NULL,
      "read_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "endpoint" varchar NOT NULL,
      "p256dh" varchar NOT NULL,
      "auth" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk"
        FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "notifications" ADD CONSTRAINT "notifications_owner_id_users_id_fk"
        FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_recipient_idx" ON "notifications" ("recipient_id");
    CREATE INDEX IF NOT EXISTS "notifications_owner_idx" ON "notifications" ("owner_id");
    CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("read");
    CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
    CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "notifications";
    DROP TABLE IF EXISTS "push_subscriptions";
    DROP TYPE IF EXISTS "public"."enum_notifications_type";
  `);
}
