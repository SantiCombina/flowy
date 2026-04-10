# Exploration: Product Sales Tracking

## Current State

### Data model relevante

- `sales` collection: tiene `date` (timestamp), `owner`, `seller`, e `items[]` — cada item tiene `variant` (relationship → `product-variants`), `quantity`, `unitPrice`, `stockSource`.
- `product-variants` collection: tiene `product` (→ `products`), `presentation` (→ `presentations`), `stock`, `costPrice`, etc.
- `products` collection: tiene `name`, `brand`, `category`, `quality`, `isActive`, `owner`.
- `presentations` collection: tiene `label` (ej: "3kg"), `amount`, `unit`, vinculada a `product`.

### Infraestructura de queries existente

- `src/app/services/sales.ts` → `getSales()` ya hace queries con `depth: 2` populando variante → producto → presentación. Retorna `SaleItemDetail[]` con `variantName`, `quantity`, `subtotal`, `variantId`.
- `src/app/services/dashboard.ts` → `getOwnerDashboardStats()` ya computa `topProducts` (por revenue) y `salesByDay` agrupado por fecha. Usa `unstable_cache` con tag `owner-dashboard`.
- `src/components/products/products-section.tsx` + `products-table.tsx` → página de productos con tabla de variantes.

### Lo que YA existe y se puede reusar

- Toda la data histórica de ventas ya está en `sales`. No hay que agregar campos.
- El `variantId` en cada `SaleItemDetail` permite agrupar ventas por variante/producto.
- `getSales()` acepta `dateFrom` — se puede usar para limitar a los últimos 12 meses.

## Affected Areas

- `src/app/services/sales.ts` — agregar nueva función `getVariantSalesHistory()`
- `src/app/services/products.ts` — agregar función que enriquezca variantes con datos de demanda
- `src/components/products/` — nuevo componente de panel/modal de demanda por variante
- `src/app/(frontend)/(main)/products/page.tsx` — posiblemente agregar nueva sub-ruta o modal

## Approaches

### 1. Pure Query Layer (sin migración)
Agregar una función de servicio que query las ventas agrupadas por variante. Sin nuevas colecciones ni campos.

- Pros:
  - **Cero riesgo de migración** — no toca la DB
  - Rápido de implementar
  - Datos siempre frescos (refleja ventas reales)
  - Reutiliza `getSales()` o hace query directa
- Cons:
  - Query costosa si hay muchas ventas (hay que limitar a 12 meses)
  - Hay que hacer `payload.find()` con `depth: 2` para cada variante o hacer una sola query grande
- Effort: Low

### 2. Materialized / Cached in ProductVariant (con migración)
Agregar campos a `product-variants`: `lastSoldAt`, `totalUnitsSold`, `monthlySalesCache[]`.

- Pros:
  - Lecturas ultra rápidas
  - Datos disponibles inline en la tabla de productos
- Cons:
  - **Requiere migración** — riesgo en producción
  - Hay que mantener los campos sincronizados (hook en `sales` afterChange/afterDelete)
  - Si se desincroniza, los datos son incorrectos
  - El array `monthlySalesCache` se vuelve complejo rápidamente
- Effort: High

### 3. Sub-ruta dedicada `/products/[id]/demand`
Una página separada por producto con gráfico completo.

- Pros: UX limpia, espacio para más analytics
- Cons: Requiere navegación extra; más código
- Effort: Medium

## Recommendation

**Opción 1 (Pure Query Layer)** con un panel lateral (Sheet) que se abre al clickear un producto/variante.

Razones:
- **Sin migración** — crítico dado que el proyecto está en producción y ya hubo pérdida de datos
- La data está toda disponible en `sales` — solo hay que agregarla
- Se puede cachear con `unstable_cache` (tag por variante o por owner) para performance
- El Sheet es el patrón ya usado en el proyecto (ActionMenu + FilterSheet ya implementados)

Implementación concreta:
1. Nueva función `getVariantSalesHistory(variantId, ownerId)` en `sales.ts` → retorna `lastSoldAt`, `totalUnits`, `totalRevenue`, y `monthlySales[12]` (últimos 12 meses)
2. Nueva función `getProductDemandSummary(ownerId)` → para la tabla de productos, retorna `lastSoldAt` y `totalUnitsSold` por variante (en bulk, una sola query)
3. Nuevo componente `ProductDemandSheet` que muestra el gráfico de barras mensual + métricas clave
4. Integrar en `variant-card.tsx` o `products-table.tsx` con un botón/icono que abre el sheet

## Risks

- **Performance**: Si un owner tiene miles de ventas, la query puede ser lenta. Mitigar: limitar a últimos 13 meses y usar `unstable_cache`.
- **Datos históricos**: Si hay ventas muy viejas antes de esta feature, igual aparecerán (es un beneficio, no un riesgo).
- **Sin migración**: Confirmado — no se toca ninguna colección Payload. Cero riesgo de pérdida de datos.

## Ready for Proposal

Sí. La exploración confirma que la feature es 100% implementable sin migraciones.
El approach recomendado es claro y de bajo riesgo.
