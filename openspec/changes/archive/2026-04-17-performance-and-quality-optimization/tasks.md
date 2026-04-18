# Tasks: Performance and Quality Optimization

## Sprint 1: DB Performance & Server-side Filtering

- [x] 1.1 Auditar `src/contexts/sales-refresh-context.tsx` y todos sus consumidores — mapear todos los `useEffect` que usan `refreshCount` como dep antes de modificar el contexto
- [x] 1.2 Verificar si `getSettings` existe en `src/app/services/` — si no existe, crear `src/app/services/settings.ts` con función `getSettings(userId: string)` que retorna user settings via `payload.find`
- [x] 1.3 Modificar `src/app/services/products.ts` — `getVariantsWithProducts`: añadir `select: { id: true }` a la query de productos (pre-filtro); eliminar comentarios inline
- [x] 1.4 Modificar `src/app/services/dashboard.ts` — añadir `select: { stock: true, costPrice: true, minimumStock: true }` y `depth: 0` a query de variants; actualizar tags de `unstable_cache` a `['dashboard', String(ownerId), period]`
- [x] 1.5 Modificar `src/app/services/stock-movements.ts` — eliminar comentarios inline
- [x] 1.6 Modificar `src/components/products/products-table.tsx` — eliminar `variantsCache`, `demandCache`, `STALE_TIME`; convertir a tabla controlada aceptando props: `variants`, `totalDocs`, `totalPages`, `currentPage`, `onPageChange`, `inventoryValue`
- [x] 1.7 Modificar `src/components/products/products-section.tsx` — añadir estado de `filters` y `page`; llamar `getVariantsAction` en cada cambio; computar `inventoryValue` desde la respuesta del action; eliminar importación del barrel file de schemas
- [x] 1.8 Ejecutar `tsc --noEmit` y `pnpm lint` — verificar 0 errores tras Sprint 1

## Sprint 2: Suspense, Streaming & Settings Flash

- [x] 2.1 Modificar `src/contexts/settings-context.tsx` — añadir prop `initialSettings: SettingsData | null` a `SettingsProvider`; eliminar `useEffect` de fetch en mount; mantener `reloadSettings` para refresh manual
- [x] 2.2 Modificar `src/app/(frontend)/(main)/layout.tsx` — llamar `getSettings(user.id)` server-side; pasar `initialSettings` como prop a `<SettingsProvider>`
- [x] 2.3 Crear `src/app/(frontend)/(main)/clients/loading.tsx` — skeleton que replica el layout de la tabla de clientes usando componentes shadcn/ui `Skeleton`
- [x] 2.4 Crear `src/app/(frontend)/(main)/assignments/loading.tsx` — skeleton que replica el layout de la tabla de asignaciones
- [x] 2.5 Crear `src/app/(frontend)/(main)/history/loading.tsx` — skeleton que replica el layout de la tabla de historial
- [x] 2.6 Crear `src/app/(frontend)/(main)/profile/loading.tsx` — skeleton que replica el layout del formulario de perfil
- [x] 2.7 Modificar `src/app/(frontend)/(main)/products/page.tsx` — envolver fetches paralelos en componente async con `<Suspense>` y fallback skeleton
- [x] 2.8 Ejecutar `tsc --noEmit` y `pnpm lint` — verificar 0 errores tras Sprint 2

## Sprint 3: Code Quality & Convention Cleanup

- [x] 3.1 Modificar `src/contexts/sales-refresh-context.tsx` — reemplazar estado `refreshCount` con llamada a `router.refresh()` (basado en auditoría 1.1); simplificar tipo de contexto a `{ triggerRefresh: () => void }`
- [x] 3.2 Modificar `src/app/services/sales.ts` — reemplazar todos los casts `as { id: number }` con `resolveId()` de `@/lib/payload-utils`
- [x] 3.3 Modificar `src/app/services/check-user.ts` y `src/app/services/users.ts` — envolver `console.error` con guard `if (process.env.NODE_ENV !== 'production')`
- [x] 3.4 Modificar `src/lib/notify.ts` — envolver `console.error` con guard `if (process.env.NODE_ENV !== 'production')`
- [x] 3.5 Modificar `src/schemas/products/product-schema.ts` — añadir `.trim().max(500)` a campo `description`; `.trim().max(100)` a campos string opcionales de ID
- [x] 3.6 Eliminar `src/components/products/product-modal-new/schemas.ts` (barrel file) — actualizar el import en `products-section.tsx` para importar directamente desde el schema fuente
- [x] 3.7 Eliminar `src/hooks/use-mobile.ts` — reemplazar todos sus usos por clases responsive de Tailwind CSS (`hidden md:block`, `block md:hidden`, etc.) [EVALUADO: mantenido — los 6 consumidores son shadcn/ui que necesitan JS para switch Drawer/Dialog; Tailwind no puede reemplazar]
- [x] 3.8 Ejecutar `tsc --noEmit` y `pnpm lint` — verificar 0 errores, 0 warnings nuevos tras Sprint 3
