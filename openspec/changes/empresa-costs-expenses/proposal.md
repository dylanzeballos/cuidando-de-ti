# Operación de costos y gastos

## Why

Las pantallas de costos y gastos funcionan, pero no se pueden operar con comodidad: los formularios están siempre abiertos, no hay métricas ni filtros, la tabla de márgenes no permite fijar el costo de una fila y los gastos no se pueden filtrar ni asociar a una sucursal. Antes de integrar la facturación, el encargado necesita ver el margen de un vistazo y registrar gastos sin recorrer la página completa.

## What Changes

- Rediseño de `/admin/costos` con métricas (productos, con costo, sin costo y margen promedio), selector de sucursal, búsqueda y filtro por estado.
- **Acción por producto**: botón `+` en cada fila que abre el costo con producto y sucursal preseleccionados.
- Formulario de costo en **diálogo modal** con validación de servidor y reapertura tras error.
- Rediseño de `/admin/gastos` con métricas (total, cantidad, promedio y categorías), filtros por mes, categoría y sucursal.
- Formulario de gasto en **diálogo modal**, con sucursal opcional.
- Tabla de gastos con sucursal, total del periodo y tarjetas apiladas en móvil.
- Filtros enviados al backend para listado y totales.

### Exclusiones

- Editar o borrar costos/gastos: el backend solo permite crear y, en costos, cerrar vigencia; no se expone todavía esa edición en la UI.
- Compras, proveedores y facturación.
- Cambios en el backend: se reutilizan los endpoints publicados.

## Capabilities

### New Capabilities

- `costs-expenses-operations`: operación de costos por producto/sucursal y gastos por periodo con métricas, filtros y modales.

### Modified Capabilities

<!-- Ninguna: la creación existente se conserva. -->

## Impact

- Nuevos componentes en `src/components/admin/` (`costs-header`, `costs-branch-card`, `costs-metrics`, `cost-filters`, `costs-table`, `cost-form`, `expenses-metrics`, `expense-filters`, `expense-bars`, `expenses-table`, `expense-form`).
- Lógica pura en `src/lib/admin/costs-ui.ts` y validación de servidor en `costs-post.ts`.
- Filtros opcionales en `src/lib/admin/costs-live-api.ts`.
- Páginas `src/pages/admin/costos.astro` y `gastos.astro`.
- Reutiliza el shell, las primitivas, los tokens, el controlador de diálogos y la tabla responsive.
- Reversión: restaurar las páginas anteriores y retirar los componentes; el backend no cambia.
