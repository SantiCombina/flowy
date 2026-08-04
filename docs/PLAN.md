# Flowy Delivery Plan

## Plan-scoped entitlement rollout

Tenant entitlements use a compatibility-first rollout. An assigned tenant receives its immutable snapshot pointer but remains `provisioning`; assignment alone never activates enforcement. Existing mutation paths must already use the tenant lock protocol before an operator starts reconciliation.

### Reconciliation checkpoints

Run `reconcileTenantEntitlements` repeatedly with a stable `runId` and `tenantId`. Each invocation processes at most 1,000 records using ID keysets across users, invitations, products, variants, clients, budgets, and sales. Progress is stored in the entitlement outbox under `entitlement-reconciliation:{runId}:tenant:{tenantId}` with the per-source high-water IDs, current cursor, processed count, snapshot pointer, lock nonces, completion state, and the last failure.

A failed or interrupted run is safe to retry with the same identifiers. It restarts from the last durable cursor; re-reading the unfinished batch is intentional and idempotent. Do not change the tenant snapshot pointer during reconciliation. A changed pointer, invalid owner, quota conflict, ownership conflict, malformed checkpoint, or validation failure keeps the tenant `provisioning` and records a failed checkpoint.

### Verification evidence

Activation requires both deterministic focused evidence and isolated PostgreSQL evidence. Run:

```powershell
pnpm test:entitlements
pnpm exec tsc --noEmit
pnpm lint --quiet
git diff --check
```

The PostgreSQL harness reads only `FLOWY_TEST_DATABASE_URL`. The URL must use `localhost`, `127.0.0.1`, or `::1`, and the database name must contain `test`. It never reads the normal `DATABASE_URL`. If an isolated database or `psql` is unavailable, record the execution as unavailable in the rollout report and DO NOT create passing activation evidence.

After every required command and the isolated race/CAS harness pass, persist evidence with `recordEntitlementEvidence` using stable `evidenceId`, `runId`, and `tenantId` values. Failed evidence remains observable but cannot activate a tenant.

### Gated activation

Call `activateTenantAction` only with the completed reconciliation `runId` and passing `evidenceId`. The activation service acquires the same tenant lock used by mutations, rereads the canonical owner, state, and snapshot, verifies evidence, reconciles the activation tail in batches of at most 1,000 without nonce gaps through the latest committed mutation, validates quotas and snapshot ownership, and performs a state-and-pointer CAS from `provisioning` to `active`.

No mutation can interleave with this activation tail because the lock remains held through validation and CAS. A missing tail event, stale pointer, failed evidence, quota violation, or CAS miss aborts activation. Waiting writers reread the now-active state after the activation transaction commits.

### Operator sequence

1. Deploy compatibility mode and confirm every affected mutation uses the tenant lock and outbox protocol.
2. Assign the immutable entitlement snapshot; verify the tenant remains `provisioning`.
3. Choose stable rollout, tenant, and evidence identifiers.
4. Invoke reconciliation until the checkpoint reports `completed`.
5. Run and record every required unit, type, lint, diff, and isolated PostgreSQL check.
6. Invoke the gated activation action and verify the result is `active`.
7. Monitor the reconciliation/evidence outbox records and activation errors before proceeding to the next tenant.

### Rollback

Stop new reconciliation and activation requests first. Tenants still `provisioning` remain disabled and can be retried with the same deterministic checkpoint after correction. For an activation failure, preserve checkpoint, evidence, snapshots, outbox history, and tenant data; repair the cause and retry without deleting records.

If the release itself must be rolled back, restore the previous application release while keeping entitlement tables and immutable snapshots for audit and forward repair. Do not downgrade active assignments, delete business data, or reverse schema outside a separately approved compatible migration.
