import 'dotenv/config';

import { Client } from 'pg';

interface OwnerRow {
  active_entitlement_snapshot_id: number | null;
  entitlement_state: 'active' | 'blocked' | 'provisioning';
  id: number;
  role: string;
}

interface PlanRow {
  created_by_id: number;
  id: number;
  version: number;
}

interface SnapshotRow {
  id: number;
  kind: 'custom' | 'plan';
  plan_version_id: number | null;
}

async function assignPlanToOwner(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  const ownerEmail = process.argv[2]?.trim();
  const planCode = process.argv[3]?.trim().toLowerCase();

  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!ownerEmail) throw new Error('Owner email is required');
  if (!planCode) throw new Error('Plan code is required');

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
  });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('flowy:assign-plan-to-owner'))`);

    const owners = await client.query<OwnerRow>(
      `SELECT id, role, entitlement_state, active_entitlement_snapshot_id
       FROM users
       WHERE lower(email) = lower($1)
       LIMIT 2
       FOR UPDATE`,
      [ownerEmail],
    );
    if (owners.rows.length !== 1) throw new Error('The requested user was not found uniquely');

    const owner = owners.rows[0];
    if (owner.role !== 'owner') throw new Error('The requested user is not an owner');

    const plans = await client.query<PlanRow>(
      `SELECT p.id, p.version, p.created_by_id
       FROM plan_versions p
       INNER JOIN users creator ON creator.id = p.created_by_id AND creator.role = 'admin'
       WHERE p.plan_code::text = $1
       ORDER BY p.version DESC
       LIMIT 1`,
      [planCode],
    );
    const plan = plans.rows[0];
    if (!plan) throw new Error(`No published ${planCode} plan was found`);

    let snapshotId = owner.active_entitlement_snapshot_id;
    if (snapshotId !== null) {
      const current = await client.query<SnapshotRow>(
        `SELECT id, kind, plan_version_id
         FROM tenant_entitlement_snapshots
         WHERE id = $1 AND tenant_id = $2`,
        [snapshotId, owner.id],
      );
      const snapshot = current.rows[0];
      if (!snapshot) throw new Error('The active entitlement snapshot is invalid');
      if (snapshot.kind !== 'plan' || snapshot.plan_version_id !== plan.id) {
        throw new Error('The owner already has a different entitlement plan');
      }
    } else {
      const idempotencyKey = `snapshot:${owner.id}:${plan.id}:1`;
      const existing = await client.query<SnapshotRow>(
        `SELECT id, kind, plan_version_id
         FROM tenant_entitlement_snapshots
         WHERE tenant_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [owner.id, idempotencyKey],
      );
      const existingSnapshot = existing.rows[0];

      if (existingSnapshot) {
        if (existingSnapshot.kind !== 'plan' || existingSnapshot.plan_version_id !== plan.id) {
          throw new Error('The existing idempotent snapshot does not match the requested plan');
        }
        snapshotId = existingSnapshot.id;
      } else {
        const created = await client.query<{ id: number }>(
          `INSERT INTO tenant_entitlement_snapshots (
            tenant_id,
            sequence,
            idempotency_key,
            kind,
            plan_version_id,
            created_by_id,
            updated_at,
            created_at
          ) VALUES ($1, 1, $2, 'plan', $3, $4, now(), now())
          RETURNING id`,
          [owner.id, idempotencyKey, plan.id, plan.created_by_id],
        );
        snapshotId = created.rows[0].id;
      }
    }

    await client.query(
      `UPDATE users
       SET active_entitlement_snapshot_id = $1,
           entitlement_state = 'provisioning',
           updated_at = now()
       WHERE id = $2`,
      [snapshotId, owner.id],
    );

    await client.query('COMMIT');
    process.stdout.write(
      `Assigned ${planCode} v${plan.version} to ${ownerEmail}; snapshot ${snapshotId}; state provisioning\n`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await assignPlanToOwner();
