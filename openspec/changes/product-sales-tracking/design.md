# Design: Product Sales Tracking

## Technical Approach

Pure query layer sobre la colección `sales` existente. Sin colecciones nuevas ni migraciones.
Dos niveles de carga: bulk summary para la tabla (última venta por variante) + historial detallado por variante cargado al abrir el sheet.

## Architecture Decisions

### Decision: Dónde agregar las funciones de servicio

**Choice**: En `src/app/services/sales.ts`
**Alternatives**: `products.ts`
**Rationale**: Los datos provienen de `sales`, no de `products`. Mantiene la separación por entidad.

### Decision: Carga del bulk summary

**Choice**: Carga paralela a `loadVariants()` en `ProductsTable`, mismo patrón de cache en módulo.
**Alternatives**: Cargar en `ProductsSection` y pasar como prop; cargar solo al abrir el sheet.
**Rationale**: Permite mostrar "última venta" como columna inline sin prop-drilling. Sigue el patrón de `variantsCache` ya establecido.

### Decision: Historial detallado — cuándo cargar

**Choice**: Lazy load al abrir el `ProductDemandSheet` (server action dentro del componente).
**Alternatives**: Pre-cargar todo para todas las variantes.
**Rationale**: Evita N queries costosas para datos que el usuario puede no ver. Solo carga cuando se abre el sheet.

### Decision: Tipo de gráfico

**Choice**: `BarChart` de Recharts (ya en el proyecto)
**Alternatives**: `AreaChart` (usado en dashboard)
**Rationale**: Barras son más apropiadas para frecuencia discreta mensual. `AreaChart` es mejor para tendencias continuas.

### Decision: Invalidación del cache de demanda

**Choice**: `revalidateTag('product-demand')` en `createSale`, `deleteSale`, `editSaleFull`
**Rationale**: Mantiene consistencia con el patrón de `owner-dashboard` / `seller-dashboard` ya usado.

## Data Flow

```
ProductsTable (mount)
  ├─→ getVariantsAction()          → variants[]
  └─→ getProductDemandSummaryAction() → Map<variantId, DemandSummary>
            ↓
     render columna "Última venta" con dato del Map

ActionMenu → "Ver demanda" → setVariantForDemand(variant)
  ↓
ProductDemandSheet (open)
  └─→ getVariantSalesHistoryAction(variantId)
            ↓
       BarChart + metric cards
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/services/sales.ts` | Modify | +`getVariantSalesHistory()`, +`getProductDemandSummary()` |
| `src/components/products/actions.ts` | Modify | +`getProductDemandSummaryAction`, +`getVariantSalesHistoryAction` |
| `src/components/products/product-demand-sheet.tsx` | Create | Sheet con BarChart + 3 metric cards |
| `src/components/products/products-table.tsx` | Modify | +carga demand summary, +columna "Última venta", +ActionMenu item, +sheet state |

## Interfaces / Contracts

```typescript
// src/app/services/sales.ts

export interface MonthlyDemand {
  month: string;       // "2025-03"
  units: number;
  revenue: number;
}

export interface VariantSalesHistory {
  variantId: number;
  lastSoldAt: string | null;
  totalUnits: number;
  totalRevenue: number;
  monthly: MonthlyDemand[];  // 12 entries, últimos 12 meses, más reciente último
}

export interface VariantDemandSummary {
  lastSoldAt: string | null;
  totalUnits: number;
}

// getProductDemandSummary(ownerId): Promise<Record<number, VariantDemandSummary>>
// getVariantSalesHistory(variantId, ownerId): Promise<VariantSalesHistory>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | Interfaces y retornos | `tsc --noEmit` |
| Lint | Convenciones del proyecto | `pnpm lint` |
| Manual | Columna "Última venta" visible en tabla | Dev server |
| Manual | Sheet abre con gráfico correcto | Dev server |
| Manual | Variante sin ventas muestra "Sin ventas" | Dev server |

## Migration / Rollout

No migration required. Solo código nuevo. Rollback: revertir `sales.ts`, `actions.ts`, `products-table.tsx` y eliminar `product-demand-sheet.tsx`.

## Open Questions

- Ninguna — diseño completo y no bloqueante.
