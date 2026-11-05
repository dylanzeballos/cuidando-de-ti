## Context

`/admin/costos` y `/admin/gastos` se renderizan en el servidor con la sesión BFF. El backend expone `POST /costs`, `GET /costs/margins` (con paginación y fecha de corte), `POST /costs/expenses`, `GET /costs/expenses` y `GET /costs/expenses/totals` (con filtros `category` y `branchId`). Las páginas actuales muestran formularios fijos, sin métricas ni filtros, y las tablas no tienen acciones.

## Goals / Non-Goals

**Goals:**

- Leer el estado de costos y gastos de un vistazo con métricas.
- Registrar costo o gasto desde un modal, sin formularios permanentes.
- Preseleccionar producto y sucursal al fijar un costo desde la tabla.
- Filtrar márgenes y gastos sin perder el contexto de sucursal o periodo.
- Mantener BFF, validación de servidor y responsive móvil.

**Non-Goals:**

- Edición o borrado de costos y gastos más allá de lo que expone el backend.
- Compras, proveedores o facturación.
- Nuevos endpoints o cambios de contrato.

## Decisions

### Métricas y filtros en el servidor

Los costos cargan sucursales, productos activos y márgenes de la sucursal. La búsqueda y el filtro de estado se aplican en el servidor con funciones puras de `costs-ui.ts`; las métricas se calculan sobre todas las filas de la sucursal para que el resumen no cambie al filtrar. Los gastos envían `category` y `branchId` al listado y a los totales, de modo que las métricas y las barras reflejan el filtro.

### Modales y preselección

`cost-form` y `expense-form` son `<dialog>` con formulario `POST`. La acción de cada fila usa `data-dialog-set` para preseleccionar producto y sucursal antes de `showModal()`: `+` cuando no hay costo y **lápiz** cuando ya existe, con el título del diálogo en “Actualizar costo”. Si la API rechaza el alta, la redirección incluye `form` y el controlador reabre el modal con el error.

### Validación compartida

`handleCostPost` y `handleExpensePost` normalizan y validan producto, sucursal, montos y fechas antes de llamar al cliente. Los mensajes son accionables y la fecha de gasto usa un valor por defecto del periodo visible.

### Filtros de gasto

El filtro de categoría es un campo de texto con sugerencias (datalist) para admitir categorías propias; la sucursal es un selector con "Todas". El periodo se mantiene en el query `period` con formato `YYYY-MM`.

## Risks / Trade-offs

- [Costo ya vigente] → Un nuevo costo con la misma fecha puede ser rechazado por solapamiento; la UI muestra el error y sugiere empezar después del último vigente.
- [Filtro de categoría exacto] → El backend recibe el texto tal cual; una categoría con otra capitalización puede no coincidir. Se ofrecen sugerencias para reducir el error.
- [Paginado acotado] → Listados y márgenes se piden con `size=100`; suficiente para el catálogo actual, se ampliará con paginación real.

## Migration Plan

1. Se publican los componentes y las páginas actualizadas.
2. Reversión: restaurar `costos.astro` y `gastos.astro` y retirar los componentes nuevos. El backend no cambia.
