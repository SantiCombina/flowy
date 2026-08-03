import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { Client } from 'pg';

import { PLAN_PRESETS } from '../src/lib/entitlements/plan-presets';

interface IdRow {
  id: number;
}

interface PlanRow extends IdRow {
  quotas_max_products: string;
  quotas_max_seller_seats: string;
  quotas_max_variants_per_product: string;
  quotas_max_variants_per_tenant: string;
}

async function seedPlanVersions(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  const adminEmail = process.env.FLOWY_PLAN_ADMIN_EMAIL?.trim();

  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!adminEmail) throw new Error('FLOWY_PLAN_ADMIN_EMAIL is required');

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
  });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('flowy:seed-plan-versions'))`);

    const admins = await client.query<IdRow>(
      `SELECT id FROM users WHERE role = 'admin' AND lower(email) = lower($1) LIMIT 2`,
      [adminEmail],
    );
    if (admins.rows.length !== 1) throw new Error('The requested admin user was not found uniquely');

    const adminId = admins.rows[0].id;
    for (const preset of PLAN_PRESETS) {
      const existing = await client.query<PlanRow>(
        `SELECT id,
          quotas_max_seller_seats,
          quotas_max_products,
          quotas_max_variants_per_product,
          quotas_max_variants_per_tenant
         FROM plan_versions
         WHERE plan_code = $1
         ORDER BY version DESC
         LIMIT 1`,
        [preset.planCode],
      );
      const existingPlan = existing.rows[0];
      if (existingPlan) {
        const capabilities = await client.query<{ capability: string }>(
          `SELECT capability FROM plan_versions_capabilities
           WHERE "_parent_id" = $1
           ORDER BY "_order"`,
          [existingPlan.id],
        );
        const matchesPreset =
          Number(existingPlan.quotas_max_seller_seats) === preset.quotas.maxSellerSeats &&
          Number(existingPlan.quotas_max_products) === preset.quotas.maxProducts &&
          Number(existingPlan.quotas_max_variants_per_product) === preset.quotas.maxVariantsPerProduct &&
          Number(existingPlan.quotas_max_variants_per_tenant) === preset.quotas.maxVariantsPerTenant &&
          JSON.stringify(capabilities.rows.map(({ capability }) => capability)) === JSON.stringify(preset.capabilities);

        if (!matchesPreset) {
          throw new Error(`Existing ${preset.planCode} version differs from the agreed preset`);
        }
        process.stdout.write(`Verified ${preset.planCode}: existing version matches preset\n`);
        continue;
      }

      const created = await client.query<IdRow>(
        `INSERT INTO plan_versions (
          plan_code,
          version,
          quotas_max_seller_seats,
          quotas_max_products,
          quotas_max_variants_per_product,
          quotas_max_variants_per_tenant,
          published_at,
          created_by_id,
          updated_at,
          created_at
        ) VALUES ($1::enum_plan_versions_plan_code, 1, $2, $3, $4, $5, now(), $6, now(), now())
        RETURNING id`,
        [
          preset.planCode,
          preset.quotas.maxSellerSeats,
          preset.quotas.maxProducts,
          preset.quotas.maxVariantsPerProduct,
          preset.quotas.maxVariantsPerTenant,
          adminId,
        ],
      );
      const planVersionId = created.rows[0].id;

      for (const [order, capability] of preset.capabilities.entries()) {
        await client.query(
          `INSERT INTO plan_versions_capabilities ("_order", "_parent_id", id, capability)
           VALUES ($1, $2, $3, $4)`,
          [order + 1, planVersionId, randomUUID(), capability],
        );
      }
      process.stdout.write(`Published ${preset.planCode} v1\n`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await seedPlanVersions();
