# Proposal: Performance and Quality Optimization

## Intent

Resolver 17 anti-patterns detectados en auditoría técnica: queries sin paginación ni `select`, variables globales mutables compartidas entre renders, falta de Suspense/streaming, y violaciones a las convenciones del proyecto (comentarios, `console.error`, `as` casts, barrel files). El objetivo es la web más rápida y fluida posible sin cambiar funcionalidad para el usuario final.

## Scope

### In Scope
- Sprint 1: optimizar DB queries (select, paginación, eliminar double-query) y eliminar filtrado client-side de variantes
- Sprint 2: agregar Suspense/`loading.tsx` en rutas sin streaming, refactorizar settings para eliminar flash de contenido
- Sprint 3: limpiar convenciones (comentarios, `console.error`, barrel files, `as` casts, schemas Zod, hooks de responsividad)

### Out of Scope
- Cambios en colecciones Payload CMS o `payload.config.ts`
- Modificar funcionalidad visible para el usuario final
- Agregar test runner (no disponible en el proyecto)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None — change es refactor puro sin modificación de requisitos de negocio

## Approach

- **Sprint 1 (DB/Performance)**: Reemplazar client-side `.filter()` con server actions paginados; añadir `select` a queries de `dashboard.ts` y `products.ts`; eliminar `variantsCache`/`demandCache` globales; agregar tags a `unstable_cache`; usar `select: { id: true }` para la primera query en `getVariantsWithProducts`.
- **Sprint 2 (UX/Streaming)**: Agregar `loading.tsx` a rutas `clients`, `assignments`, `history`, `profile`; envolver `products/page.tsx` en Suspense; mover carga de settings al Server Component del layout.
- **Sprint 3 (Calidad)**: Eliminar barrel file de schemas; remover comentarios; agregar `NODE_ENV` guard a `console.error`; aplicar `.trim()` y `.max()` a campos opcionales de schemas Zod; reemplazar `use-mobile.ts` con clases Tailwind; refactorizar `SalesRefreshContext` con `router.refresh()`; consolidar `check-user.ts` en `users.ts`; reemplazar `as` casts por `resolveId`; añadir paginación a `getStockMovements`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/products/products-table.tsx` | Modified | Filtrado server-side + paginación |
| `src/app/services/products.ts` | Modified | Eliminar double-query, cache global, comentarios |
| `src/app/services/dashboard.ts` | Modified | Agregar `select`, tags a `unstable_cache` |
| `src/app/services/sales.ts` | Modified | Reemplazar `as` casts con `resolveId` |
| `src/app/services/stock-movements.ts` | Modified | Paginación real, eliminar comentarios |
| `src/app/(frontend)/(main)/*/loading.tsx` | New | Rutas sin loading state propio |
| `src/app/(frontend)/(main)/products/page.tsx` | Modified | Suspense boundaries |
| `src/components/settings/settings-context.tsx` | Modified | Datos desde Server Component via props |
| `src/components/product-modal-new/schemas.ts` | Removed | Barrel file eliminado |
| `src/lib/check-user.ts` | Removed | Consolidado en `users.ts` |
| `src/hooks/use-mobile.ts` | Removed | Reemplazado por Tailwind CSS |
| `src/schemas/products/product-schema.ts` | Modified | `.trim()` y `.max()` en campos opcionales |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Paginación rompe filtros existentes en UI | Med | Verificar todos los filtros de `products-table` antes de migrar |
| Cambio en settings-context causa flash inverso | Low | Testear en staging con datos reales de owner |
| Eliminar `variantsCache` global degrada perf en edge cases | Low | Comparar tiempos de respuesta antes/después |

## Rollback Plan

Todos los cambios son refactors sin schema migrations. Rollback via `git revert` por sprint. No se requiere `pnpm generate:types` — no se modifican colecciones. Cada sprint puede revertirse de forma independiente.

## Dependencies

- `src/lib/payload-utils.ts` debe exportar `resolveId` (verificar antes del Sprint 3)

## Success Criteria

- [ ] `products-table.tsx` filtra y pagina server-side; no carga 10.000 variantes en cliente
- [ ] `variantsCache` y `demandCache` eliminadas del módulo global
- [ ] Todas las queries de dashboard incluyen `select` con campos mínimos
- [ ] Rutas `clients`, `assignments`, `history`, `profile` tienen `loading.tsx` o Suspense
- [ ] `products/page.tsx` muestra skeleton mientras carga servicios en paralelo
- [ ] Settings no producen flash de contenido al montar
- [ ] `tsc --noEmit` pasa sin errores
- [ ] `pnpm lint` pasa sin warnings nuevos
- [ ] Cero barrel files, cero comentarios, cero `console.error` sin guard
