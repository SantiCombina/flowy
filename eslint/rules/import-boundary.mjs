/** @type {import('eslint').Rule.RuleModule} */
const importBoundaryRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent client code from importing server-only modules at runtime',
    },
    schema: [],
    messages: {
      noServerImport: "Client code must not import server-only module '{{module}}'. Use server actions instead.",
    },
  },
  create(context) {
    const sourcePath = context.filename ?? context.getFilename();
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const text = sourceCode.getText();
    const topDirective = text.trimStart().match(/^['\"]use (client|server|cache)['\"]/);
    const directive = topDirective?.[1];

    // Only enforce in client components; server actions and server components are exempt.
    if (directive !== 'client') {
      return {};
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') {
          return;
        }

        const value = node.source.value;
        if (typeof value !== 'string') {
          return;
        }

        const isServerOnlyImport =
          value.startsWith('@/app/services/') || value === '@/lib/payload' || value.startsWith('@/lib/payload/');

        if (!isServerOnlyImport) {
          return;
        }

        const anyRuntimeSpecifier = node.specifiers.some((specifier) => specifier.importKind !== 'type');
        if (!anyRuntimeSpecifier) {
          return;
        }

        context.report({
          node,
          messageId: 'noServerImport',
          data: { module: value },
        });
      },
    };
  },
};

export default importBoundaryRule;
