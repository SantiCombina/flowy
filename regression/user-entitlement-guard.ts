import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Users } from '@/collections/Users';

const beforeChange = Users.hooks?.beforeChange?.[0];

if (typeof beforeChange !== 'function') {
  throw new Error('Users beforeChange hook is required');
}

const beforeChangeHook = beforeChange;

interface HookInput {
  context?: Record<string, unknown>;
  data: Record<string, unknown>;
  operation: 'create' | 'update';
  originalDoc?: Record<string, unknown>;
  req?: {
    payload: {
      findByID: () => Promise<{ tenant: number }>;
    };
  };
}

function runHook(input: HookInput) {
  return beforeChangeHook(input as never);
}

describe('Users entitlement mutation guard', () => {
  it('allows an unrelated owner update when entitlement values are unchanged', async () => {
    const data = {
      businessName: 'Renamed business',
      entitlementState: 'active',
      activeEntitlementSnapshot: { id: 101 },
    };

    const result = await runHook({
      context: {},
      data,
      operation: 'update',
      originalDoc: {
        id: 7,
        role: 'owner',
        entitlementState: 'active',
        activeEntitlementSnapshot: 101,
      },
      req: {
        payload: {
          findByID: async () => ({ tenant: 7 }),
        },
      },
    });

    assert.strictEqual(result, data);
  });

  it('treats null and undefined entitlement states as the same absent value', async () => {
    const data = {
      businessName: 'Renamed business',
      entitlementState: null,
    };

    const result = await runHook({
      context: {},
      data,
      operation: 'update',
      originalDoc: { id: 7, role: 'owner', entitlementState: undefined },
    });

    assert.strictEqual(result, data);
  });

  it('treats null and undefined entitlement snapshots as the same absent value', async () => {
    const data = {
      businessName: 'Renamed business',
      activeEntitlementSnapshot: null,
    };

    const result = await runHook({
      context: {},
      data,
      operation: 'update',
      originalDoc: { id: 7, role: 'owner', activeEntitlementSnapshot: undefined },
    });

    assert.strictEqual(result, data);
  });

  it('rejects a real entitlement state update without trusted context', async () => {
    await assert.rejects(
      runHook({
        context: {},
        data: { entitlementState: 'blocked' },
        operation: 'update',
        originalDoc: { id: 7, role: 'owner', entitlementState: 'active' },
      }),
      /User entitlement mutation requires trusted context/,
    );
  });

  it('rejects a real entitlement snapshot update without trusted context', async () => {
    await assert.rejects(
      runHook({
        context: {},
        data: { activeEntitlementSnapshot: { id: 102 } },
        operation: 'update',
        originalDoc: { id: 7, role: 'owner', activeEntitlementSnapshot: 101 },
      }),
      /User entitlement mutation requires trusted context/,
    );
  });

  it('allows real entitlement state and snapshot updates with trusted context', async () => {
    const data = {
      entitlementState: 'blocked',
      activeEntitlementSnapshot: { id: 102 },
    };

    const result = await runHook({
      context: { entitlementMutation: true },
      data,
      operation: 'update',
      originalDoc: {
        id: 7,
        role: 'owner',
        entitlementState: 'active',
        activeEntitlementSnapshot: 101,
      },
      req: {
        payload: {
          findByID: async () => ({ tenant: 7 }),
        },
      },
    });

    assert.strictEqual(result, data);
  });

  it('rejects entitlement initialization on create without trusted context', async () => {
    await assert.rejects(
      runHook({
        context: {},
        data: {
          id: 7,
          role: 'owner',
          entitlementState: 'provisioning',
          activeEntitlementSnapshot: { id: 101 },
        },
        operation: 'create',
      }),
      /User entitlement mutation requires trusted context/,
    );
  });

  it('allows create with explicitly null entitlement fields without trusted context', async () => {
    const data = {
      id: 7,
      role: 'owner',
      entitlementState: null,
      activeEntitlementSnapshot: null,
    };

    const result = await runHook({
      context: {},
      data,
      operation: 'create',
    });

    assert.strictEqual(result, data);
  });

  it('allows entitlement initialization on create with trusted context', async () => {
    const data = {
      id: 7,
      role: 'owner',
      entitlementState: 'provisioning',
      activeEntitlementSnapshot: { id: 101 },
    };

    const result = await runHook({
      context: { entitlementMutation: true },
      data,
      operation: 'create',
      req: {
        payload: {
          findByID: async () => ({ tenant: 7 }),
        },
      },
    });

    assert.strictEqual(result, data);
  });
});
