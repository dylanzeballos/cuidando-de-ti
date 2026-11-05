# Operaciones de inventario

## Why

La pantalla de inventario actual solo permite listar sucursales y registrar movimientos con formularios siempre abiertos. Para operar la farmacia antes de integrar la facturación faltan las **transferencias entre sucursales**, la búsqueda y el filtro por estado de existencias, y una lectura rápida del stock bajo. Sin eso, el inventario no cubre el flujo real de un encargado de almacén.

## What Changes

- Rediseño de `/admin/inventario` dentro del shell: métricas, selector de sucursal, formularios plegables y tabla de existencias filtrable.
- **Transferencias entre sucursales** desde la UI usando `POST /api/v1/inventory/transfers`.
- **Acciones rápidas por producto**: botones `+` y `−` en la tabla que abren el movimiento con tipo y producto preseleccionados.
- Formularios de sucursal, movimiento y transferencia en **diálogos modales** con botones de icono.
- Cantidades **enteras** con paso de 1 unidad, validadas en el servidor.
- Filtros por texto (nombre/SKU) y estado (`stock bajo`, `agotado`, `disponible`, `sin registro`).
- Estados de existencias con umbral de 10 unidades y etiquetas visuales.
- Validación de servidor antes de llamar a la API y redirección PRG con mensajes legibles.
- Tabla de existencias como tarjetas apiladas en móvil.

### Exclusiones

- Compras, proveedores, facturación y edición de productos/categorías (van en cambios posteriores).
- Endpoint masivo de stock en el backend: se sigue consultando por producto (N+1 acotado).
- No se añaden variables `PUBLIC_` ni credenciales al navegador.

## Capabilities

### New Capabilities

- `inventory-operations`: operación de inventario por sucursal con métricas, filtros, movimientos y transferencias.

### Modified Capabilities

<!-- Ninguna: la administración de catálogo e inventario existente se conserva. -->

## Impact

- Nuevos componentes en `src/components/admin/` (`inventory-header`, `inventory-branch-card`, `inventory-stock-card`, `inventory-metrics`, `branch-form`, `branch-picker`, `movement-form`, `transfer-form`, `stock-filters`, `stock-table`).
- Lógica pura en `src/lib/admin/inventory.ts` (estado de existencias y filtros).
- `transferStock` en `src/lib/admin/catalog-api.ts` y validación de cantidades enteras en `inventory-page.ts`.
- `src/pages/admin/inventario.astro`, `src/styles/admin/{inventory,actions}.css` y el controlador de diálogos compartido.
- Reutiliza el shell, la sesión BFF, los componentes primitivos y las tarjetas de tabla responsive.
- Depende del endpoint de transferencias ya publicado por `../plataforma-core-api`.
- Reversión: retirar los componentes y la ruta vuelve a la versión anterior; no cambia el backend.
