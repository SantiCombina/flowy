# Proposal: Product Sales Tracking

## Intent

Los owners no tienen visibilidad de la demanda histórica por producto/presentación. No saben cuándo fue la última venta de cada variante ni con qué frecuencia se vende en cada mes. Esto dificulta decisiones de reposición de stock y detección de productos estancados.

## Scope

### In Scope
- Nueva función de servicio `getVariantSalesHistory(variantId, ownerId)` → retorna última venta, totales y ventas mensuales de los últimos 13 meses
- Nueva función `getProductDemandSummary(ownerId)` → bulk query para mostrar `lastSoldAt` + `totalUnitsSold` por variante en la tabla de productos
- Nuevo componente `ProductDemandSheet` con gráfico de barras mensual (Recharts) + métricas clave (última venta, unidades totales, ingresos totales)
- Integración en la tabla de productos: columna/indicador de última venta + botón que abre el sheet de demanda

### Out of Scope
- Migraciones o campos nuevos en colecciones Payload
- Analytics por cliente o vendedor (scope del dashboard)
- Alertas automáticas por producto sin ventas recientes (feature separada)
- Exportación de datos de demanda

## Capabilities

### New Capabilities
- `product-demand`: Consulta y visualización de historial de ventas por variante de producto, incluyendo frecuencia mensual y métricas de demanda

### Modified Capabilities
- None

## Approach

Pure Query Layer sobre la colección `sales` existente. Sin migraciones.

1. `sales.ts` — nueva función `getVariantSalesHistory()`: query `sales` filtrando por `owner` y fecha (últimos 13 meses), extrae items del variant pedido, agrupa por mes y calcula métricas. Cacheada con `unstable_cache`.
2. `sales.ts` — nueva función `getProductDemandSummary()`: query única de todas las ventas del owner (últimos 13 meses), construye un `Map<variantId, { lastSoldAt, totalUnits }>` en memoria.
3. `src/components/products/product-demand-sheet.tsx` — Client Component con `BarChart` de Recharts (ya en el proyecto), métricas en cards, trigger desde la tabla.
4. `products-table.tsx` / `variant-card.tsx` — agregar columna "Última venta" + botón de apertura del sheet.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/services/sales.ts` | Modified | +2 funciones de agregación |
| `src/components/products/products-table.tsx` | Modified | Columna última venta + trigger sheet |
| `src/components/products/product-demand-sheet.tsx` | New | Sheet con gráfico y métricas |
| `src/app/(frontend)/(main)/products/page.tsx` | Modified | Pasar datos de demanda al componente |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Query lenta con muchas ventas | Low | Limitar a 13 meses; `unstable_cache` con tag `product-demand` |
| Sin migración → cero riesgo de pérdida de datos | — | Confirmado por exploración |

## Rollback Plan

Al ser solo código nuevo (funciones + componente), el rollback es eliminar los archivos nuevos y revertir las modificaciones a `products-table.tsx` y `products/page.tsx`. No hay cambios en DB ni en colecciones Payload.

## Dependencies

- Recharts ya instalado (`recharts ^3.8.0` en `package.json`)
- No hay dependencias externas nuevas

## Success Criteria

- [ ] La tabla de productos muestra "Última venta" por cada variante (o "Sin ventas" si no tiene)
- [ ] Al abrir el sheet de demanda, se muestra el gráfico de barras con unidades vendidas por mes (últimos 12 meses)
- [ ] Las métricas clave son correctas: última venta, total de unidades vendidas, total de ingresos
- [ ] Los datos de demanda no requieren ninguna migración de base de datos
- [ ] `tsc --noEmit` y `pnpm lint` pasan sin errores
