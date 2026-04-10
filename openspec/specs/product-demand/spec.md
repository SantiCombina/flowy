# Product Demand Specification

## Purpose

Permite a los owners consultar la demanda histórica de cada variante de producto: última venta, unidades vendidas por mes y métricas agregadas. Facilita decisiones de reposición de stock y detección de productos estancados.

## Requirements

### Requirement: Resumen de demanda en tabla de productos

La tabla de productos DEBE mostrar para cada variante la fecha de su última venta o indicar que no tiene ventas registradas.

El sistema DEBE obtener los datos de demanda sin requerir ninguna migración de base de datos ni campos adicionales en colecciones Payload.

Los datos de demanda DEBEN estar disponibles para todos los owners autenticados respecto a sus propias variantes únicamente.

#### Scenario: Variante con ventas registradas

- GIVEN un owner autenticado con al menos una venta que incluye una variante
- WHEN carga la tabla de productos
- THEN cada variante con ventas muestra la fecha de su última venta en formato legible
- AND el dato refleja la venta más reciente registrada para esa variante

#### Scenario: Variante sin ventas registradas

- GIVEN un owner autenticado con una variante que nunca fue vendida
- WHEN carga la tabla de productos
- THEN esa variante muestra "Sin ventas" o equivalente en lugar de una fecha

#### Scenario: Aislamiento multi-tenant

- GIVEN dos owners distintos con variantes propias
- WHEN cada uno carga su tabla de productos
- THEN cada owner SOLO ve datos de demanda de sus propias variantes

---

### Requirement: Historial detallado de demanda por variante

El sistema DEBE proveer un historial de ventas mensual para una variante individual, cubriendo los últimos 12 meses calendario.

El historial DEBE incluir: unidades vendidas por mes, total de ingresos por mes, fecha de última venta, total de unidades vendidas (período), total de ingresos (período).

#### Scenario: Variante con ventas en múltiples meses

- GIVEN un owner autenticado y una variante con ventas distribuidas en varios meses
- WHEN consulta el historial de demanda de esa variante
- THEN el sistema retorna un array de 12 entradas (una por mes, últimos 12 meses)
- AND cada entrada contiene unidades vendidas e ingresos para ese mes
- AND los meses sin ventas tienen valores en cero

#### Scenario: Variante con ventas solo en el mes actual

- GIVEN una variante con ventas únicamente en el mes corriente
- WHEN se consulta su historial
- THEN solo el mes actual tiene valores mayores a cero
- AND los 11 meses anteriores muestran cero

#### Scenario: Variante sin ninguna venta

- GIVEN una variante que nunca fue incluida en ninguna venta
- WHEN se consulta su historial
- THEN todos los meses retornan cero
- AND `lastSoldAt` es `null`
- AND `totalUnits` es `0`

---

### Requirement: Visualización de demanda en panel lateral

El sistema DEBE mostrar el historial de demanda en un panel lateral (sheet) accesible desde la tabla de productos.

El panel DEBE mostrar: gráfico de barras mensual (12 meses), fecha de última venta, total de unidades vendidas, total de ingresos generados.

El panel SOLO DEBE ser accesible para usuarios con rol `owner`.

#### Scenario: Owner abre el panel de demanda de una variante

- GIVEN un owner autenticado en la tabla de productos
- WHEN selecciona "Ver demanda" para una variante
- THEN se abre un sheet lateral con el gráfico de barras mensual
- AND se muestran las métricas clave: última venta, unidades totales, ingresos totales

#### Scenario: Gráfico muestra estacionalidad

- GIVEN una variante con ventas concentradas en ciertos meses del año
- WHEN el owner abre el panel de demanda
- THEN el gráfico de barras refleja visualmente los picos y valles de demanda mensual

#### Scenario: Panel de variante sin ventas

- GIVEN una variante sin ventas registradas
- WHEN el owner abre su panel de demanda
- THEN el gráfico muestra barras en cero para todos los meses
- AND las métricas muestran "Sin ventas" para última venta y cero para unidades e ingresos

#### Scenario: Seller no accede al panel de demanda

- GIVEN un usuario con rol `seller`
- WHEN visualiza la tabla de productos
- THEN NO se muestra la opción de ver demanda por variante
