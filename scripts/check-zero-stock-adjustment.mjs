import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compile = (path) => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const schemaExports = {};
runInNewContext(compile('src/schemas/stock-movements/stock-movement-schema.ts'), {
  exports: schemaExports,
  require,
});
const schema = schemaExports.registerStockMovementSchema;
const modalSource = compile('src/components/products/modals/stock-movement-modal.tsx');

function renderModal(type, quantity) {
  const exported = {};
  const states = [type, quantity, ''];
  const submissions = [];
  runInNewContext(modalSource, {
    exports: exported,
    require(name) {
      if (name === 'react') return { useState: () => [states.shift(), () => {}] };
      if (name === 'react/jsx-runtime') return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      };
      if (name === 'next-safe-action/hooks') return { useAction: () => ({
        isExecuting: false,
        executeAsync: async (data) => {
          schema.parse(data);
          submissions.push(data);
          return undefined;
        },
      }) };
      if (name.includes('use-invalidate-queries')) return { useInvalidateQueries: () => ({ invalidateQueries() {} }) };
      if (name.includes('stock-movement-title')) return { formatStockMovementVariantTitle: () => 'Product' };
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  const tree = exported.StockMovementModal({ isOpen: true, onClose() {}, variant: { id: 204, stock: 85 } });
  const nodes = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { nodes, submissions };
}

for (const [type, quantity, expected] of [
  ['adjustment', 0, true], ['adjustment', 12, true], ['adjustment', -1, false],
  ['entry', 0, false], ['entry', 2, true], ['exit', 0, false], ['exit', 2, true],
]) {
  test(`server validation: ${type} ${quantity} accepted=${expected}`, () => {
    assert.equal(schema.safeParse({ variantId: 204, type, quantity }).success, expected);
  });
}

for (const [type, quantity, expected] of [
  ['adjustment', '0', true], ['adjustment', '12', true], ['adjustment', '-1', false],
  ['adjustment', '', false], ['entry', '0', false], ['entry', '2', true],
  ['exit', '0', false], ['exit', '2', true],
]) {
  test(`stock modal: ${type} ${JSON.stringify(quantity)} enabled=${expected}`, async () => {
    const { nodes, submissions } = renderModal(type, quantity);
    const submit = nodes.find((node) => node.props?.type === 'submit');
    assert.equal(Boolean(submit.props.disabled), !expected);
    await nodes.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(submissions.length, expected ? 1 : 0);
    if (expected) {
      assert.equal(submissions[0].type, type);
      assert.equal(submissions[0].quantity, Number(quantity));
      assert.equal(submissions[0].variantId, 204);
      assert.ok(nodes.some((node) => JSON.stringify(node.props?.children) === JSON.stringify([
        'Nuevo stock: ', type === 'adjustment' ? Number(quantity) : type === 'entry' ? 85 + Number(quantity) : 85 - Number(quantity), ' unidades', false,
      ])));
    }
  });
}
