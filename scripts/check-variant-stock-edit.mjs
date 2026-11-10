import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/app/services/products.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function scenario({ stock = 10, failMovement = false, failCommit = false, owner = 7 } = {}) {
  let stored = { id: 204, owner, stock, costPrice: 5 };
  let pending;
  let movements = [];
  let pendingMovements = [];
  const tags = [];
  const calls = [];
  const payload = {
    db: {
      async beginTransaction() {
        calls.push('begin');
        pending = { ...stored };
        pendingMovements = [];
        return 'tx';
      },
      async commitTransaction(id) {
        assert.equal(id, 'tx');
        if (failCommit) throw new Error('commit failed');
        stored = pending;
        movements.push(...pendingMovements);
        calls.push('commit');
      },
      async rollbackTransaction(id) {
        assert.equal(id, 'tx');
        pending = undefined;
        pendingMovements = [];
        calls.push('rollback');
      },
    },
    async findByID(options) {
      calls.push(['read', options.req?.transactionID]);
      return { ...(options.req ? pending : stored) };
    },
    async update(options) {
      assert.equal(options.id, 204);
      calls.push(['update', options.req?.transactionID]);
      if (options.req) pending = { ...pending, ...options.data };
      else stored = { ...stored, ...options.data };
      return { ...(options.req ? pending : stored) };
    },
    async create(options) {
      assert.equal(options.collection, 'stock-movements');
      assert.equal(options.req?.transactionID, 'tx');
      if (failMovement) throw new Error('movement failed');
      pendingMovements.push(options.data);
      return { id: 1, ...options.data };
    },
  };
  const exported = {};
  runInNewContext(source, {
    exports: exported,
    require(name) {
      if (name === '@/lib/payload') return { getPayloadClient: async () => payload };
      if (name === 'next/cache') return { revalidateTag: (tag) => tags.push(tag) };
      if (name === '@/lib/payload-utils') return { resolveId: (value) => typeof value === 'number' ? value : value?.id };
      if (name === '@/lib/cache-tags') return { cacheTags: {
        products: (id) => `products:${id}`,
        saleOptions: (id) => `sales:${id}`,
        history: (id) => `history:${id}`,
      } };
      return {};
    },
  });
  return { update: exported.updateVariant, state: () => ({ stored, movements, tags, calls }) };
}

for (const [label, previous, next] of [['increase', 0, 80], ['decrease', 80, 0]]) {
  test(`records an inventory adjustment on stock ${label}`, async () => {
    const fixture = scenario({ stock: previous });
    const result = await fixture.update(204, { stock: next, costPrice: 20 }, 7);
    const { stored, movements, tags, calls } = fixture.state();
    assert.equal(result.stock, next);
    assert.equal(stored.stock, next);
    assert.equal(stored.costPrice, 20);
    assert.equal(movements.length, 1);
    assert.equal(JSON.stringify(movements[0]), JSON.stringify({
      variant: 204, type: 'adjustment', quantity: next - previous,
      previousStock: previous, newStock: next, reason: 'Edición de producto', owner: 7, createdBy: 7,
    }));
    assert.ok(tags.includes('history:7'));
    assert.ok(tags.includes('products:7'));
    assert.ok(tags.includes('sales:7'));
    assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'read' && call[1] === 'tx'));
    assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'update' && call[1] === 'tx'));
    assert.ok(calls.includes('commit'));
  });
}

for (const data of [{ costPrice: 12 }, { stock: 10, costPrice: 12 }]) {
  test(`preserves ordinary edits without a movement: ${JSON.stringify(data)}`, async () => {
    const fixture = scenario();
    await fixture.update(204, data, 7);
    const { stored, movements } = fixture.state();
    assert.equal(stored.stock, 10);
    assert.equal(stored.costPrice, 12);
    assert.equal(movements.length, 0);
  });
}

for (const failure of ['failMovement', 'failCommit']) {
  test(`rolls back both stock and history on ${failure}`, async () => {
    const fixture = scenario({ [failure]: true });
    await assert.rejects(fixture.update(204, { stock: 80, costPrice: 20 }, 7), /failed/);
    const { stored, movements, tags, calls } = fixture.state();
    assert.equal(stored.stock, 10);
    assert.equal(stored.costPrice, 5);
    assert.equal(movements.length, 0);
    assert.equal(tags.length, 0);
    assert.ok(calls.includes('rollback'));
  });
}

test('preserves tenant ownership checks without changing stored data', async () => {
  const fixture = scenario({ owner: 8 });
  await assert.rejects(fixture.update(204, { stock: 80 }, 7), /Variante no encontrada/);
  const { stored, movements } = fixture.state();
  assert.equal(stored.stock, 10);
  assert.equal(movements.length, 0);
});
