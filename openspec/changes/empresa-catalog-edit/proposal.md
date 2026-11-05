# Catálogo editable

## Why

El catálogo actual solo permite crear categorías y productos. Un encargado de farmacia no puede corregir un precio, cambiar el impuesto, reasignar la categoría ni retirar de la venta un producto o una categoría. Sin edición, cualquier error de carga obliga a llamar a la API a mano y el catálogo deja de ser operable antes de integrar la facturación.

## What Changes

- **Editar producto** desde `/admin/catalogo` en un diálogo modal nativo: nombre, descripción, código de barras, unidad, precio de venta, costo, impuesto, categoría y estado.
- **Activar/desactivar productos** desde la tabla, con confirmación al desactivar.
- **Activar/desactivar categorías** desde la lista, con confirmación al desactivar.
- El **SKU** queda inmutable porque el backend no lo acepta en la actualización.
- Controlador de diálogos compartido en el shell para abrir/cerrar modales, bloquear el scroll y reabrir el diálogo que falló.
- Registro de errores legible con redirección PRG que conserva los filtros de la página.

### Exclusiones

- Renombrar categorías: `UpdateCategoryRequest` solo acepta `active`.
- Borrar productos o categorías: se usa la baja lógica.
- Edición masiva, importación y precios por sucursal.
- Cambios en el backend: los endpoints `PATCH` ya existen.

## Capabilities

### New Capabilities

- `catalog-edit`: edición y baja lógica de productos y categorías desde el panel.

### Modified Capabilities

<!-- Ninguna: la creación de catálogo existente se conserva. -->

## Impact

- `src/components/admin/product-edit-dialog.astro` y `dialog-controller.astro` (nuevos).
- `src/components/admin/products-table.astro`, `user-roles-dialog.astro`, `users-table.astro` y `admin-shell.astro`.
- `src/lib/admin/catalog-page.ts`, `catalog-types.ts` y `catalog-api.ts` (separación de tipos y reexportación).
- `src/pages/admin/catalogo.astro`, `src/styles/admin/{catalog,modal,forms}.css`.
- Reutiliza el cliente BFF, la sesión de servidor, las primitivas y los filtros existentes.
- Reversión: retirar el diálogo y las acciones; los endpoints del backend no cambian.
