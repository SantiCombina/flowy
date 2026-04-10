# Tasks: Product Sales Tracking

## Phase 1: Service Layer

- [x] 1.1 Agregar interfaces `MonthlyDemand`, `VariantSalesHistory`, `VariantDemandSummary` en `src/app/services/sales.ts`
- [x] 1.2 Implementar `getProductDemandSummary(ownerId)` en `src/app/services/sales.ts` — query ventas últimos 13 meses, construir `Record<variantId, VariantDemandSummary>` en memoria, cachear con `unstable_cache` y tag `product-demand`
- [x] 1.3 Implementar `getVariantSalesHistory(variantId, ownerId)` en `src/app/services/sales.ts` — query ventas del variant en últimos 13 meses, agrupar por mes (12 entries), calcular `lastSoldAt`, `totalUnits`, `totalRevenue`, cachear con `unstable_cache` y tag `product-demand`
- [x] 1.4 Agregar `revalidateTag('product-demand')` en `createSale()`, `deleteSale()` y `editSaleFull()` en `src/app/services/sales.ts`

## Phase 2: Action Layer

- [x] 2.1 Agregar `getProductDemandSummaryAction` en `src/components/products/actions.ts` — auth `owner` only, llama `getProductDemandSummary(user.id)`, retorna `{ success: true, demand }`
- [x] 2.2 Agregar `getVariantSalesHistoryAction` en `src/components/products/actions.ts` — schema `z.object({ variantId: z.number() })`, auth `owner` only, llama `getVariantSalesHistory(variantId, user.id)`, retorna `{ success: true, history }`

## Phase 3: Componente ProductDemandSheet

- [x] 3.1 Crear `src/components/products/product-demand-sheet.tsx` — Client Component con Sheet (shadcn), recibe `variant: PopulatedProductVariant | null` y `onClose: () => void`
- [x] 3.2 En `ProductDemandSheet`: al abrir (cuando `variant` cambia a non-null), llamar `getVariantSalesHistoryAction` con `useAction` y mostrar estado de carga
- [x] 3.3 En `ProductDemandSheet`: renderizar 3 metric cards — "Última venta" (fecha formateada o "Sin ventas"), "Unidades vendidas" (total), "Ingresos totales" (currency)
- [x] 3.4 En `ProductDemandSheet`: renderizar `BarChart` de Recharts con `monthly[]` — eje X mes abreviado, eje Y unidades, tooltip con unidades e ingresos del mes

## Phase 4: Integración en ProductsTable

- [x] 4.1 En `src/components/products/products-table.tsx`: agregar estado `demandMap: Record<number, VariantDemandSummary>` y módulo-cache `demandCache` paralelo a `variantsCache`
- [x] 4.2 En `loadVariants()`: llamar `getProductDemandSummaryAction()` en paralelo con `getVariantsAction()`, guardar resultado en `demandMap`
- [x] 4.3 Agregar columna `lastSold` en `allColumns`: header "Última venta", cell muestra fecha relativa del `demandMap[variant.id]?.lastSoldAt` o "Sin ventas"
- [x] 4.4 Agregar `{ label: 'Ver demanda', icon: BarChart2, onClick: () => setVariantForDemand(variant) }` en el `ActionMenu` de `actionsColumn` (solo visible cuando `showActions` es true, que ya implica rol owner)
- [x] 4.5 Agregar estado `variantForDemand: PopulatedProductVariant | null` y renderizar `<ProductDemandSheet>` al final del componente, junto a `StockMovementModal`

## Phase 5: Verificación

- [x] 5.1 Ejecutar `tsc --noEmit` — debe pasar sin errores
- [x] 5.2 Ejecutar `pnpm lint` — debe pasar sin errores
- [x] 5.3 Verificar en dev: tabla muestra columna "Última venta" con fechas correctas para variantes con ventas
- [x] 5.4 Verificar en dev: variante sin ventas muestra "Sin ventas" en la columna
- [x] 5.5 Verificar en dev: sheet abre con gráfico y métricas correctas al clickear "Ver demanda"
- [x] 5.6 Verificar en dev: seller NO ve la opción "Ver demanda" en el menú
