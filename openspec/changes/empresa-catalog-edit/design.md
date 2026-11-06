## Context

`/admin/catalogo` se renderiza en el servidor con la sesión BFF y el cliente autenticado. Ya permite crear categorías y productos y filtrar por texto, categoría y estado, pero no editar. El backend expone `PATCH /api/v1/catalog/products/{id}` (campos nulos = sin cambio, SKU inmutable) y `PATCH /api/v1/catalog/categories/{id}` (solo `active`).

## Goals / Non-Goals

**Goals:**

- Corregir cualquier dato editable de un producto sin salir del catálogo.
- Retirar y restaurar productos y categorías con baja lógica.
- Mantener el patrón BFF y la validación de servidor.
- Reutilizar un único controlador de diálogos en todo el panel.

**Non-Goals:**

- Renombrar categorías o borrarlas físicamente.
- Editar SKU o cambiar la empresa del recurso.
- Edición masiva o historial de cambios.

## Decisions

### Diálogo modal nativo por producto

Cada fila renderiza un `<dialog class="adm-modal adm-modal--wide">` con el formulario `POST`. Se abre con `showModal()` desde un botón `data-dialog-target`. No se hidrata React. Si la actualización falla, la redirección incluye `openProductId` y el controlador reabre el diálogo correspondiente con el mensaje de error.

### Controlador de diálogos compartido

`dialog-controller.astro` usa delegación de eventos para abrir/cerrar cualquier `[data-dialog-target]`/`[data-dialog-close]`, cierra con backdrop o Escape, bloquea el scroll y gestiona `form[data-confirm]`. Se incluye una sola vez en `admin-shell`, y el diálogo de roles se migró a este controlador para eliminar su script duplicado.

### Validación y campos enviados

La página delega en `handleCatalogPost` (lógica pura en `src/lib`). Las reglas viven en `catalog-schema.ts` con Zod y se comparten entre el servidor y el script de validación anticipada del navegador; el servidor sigue siendo la autoridad. Se validan nombre, marca, unidad, precio y costo antes de llamar a la API. En la edición se omite `categoryId` vacío porque `null` significa "sin cambio" en el contrato; el SKU nunca se envía y el backend lo genera a partir del UUID del producto. El estado se actualiza por acciones separadas (`product-status`, `category-status`) para que el botón de la tabla funcione sin abrir el diálogo.

### Diálogos para el alta

La creación de producto y de categoría usa `<dialog>` nativo con el controlador existente, igual que la edición. Los campos de producto se comparten en `product-fields.astro` para no duplicar markup ni identificadores entre alta y edición. Si la validación falla, la redirección incluye `openForm` para reabrir el diálogo correcto.

### Tipos separados

`catalog-api.ts` superaba las 200 líneas al crecer con la edición. Los DTO se movieron a `catalog-types.ts` y se reexportan desde `catalog-api.ts`, de modo que los imports existentes siguen funcionando.

## Risks / Trade-offs

- [Categoría no se puede quitar] → El contrato no distingue "sin categoría" de "sin cambio"; se documenta en la UI y se deja el valor actual.
- [Doble envío] → Los formularios PRG recargan la página; no se añade bloqueo optimista.
- [Confirmación nativa] → `window.confirm` es suficiente y accesible; se evita otra dependencia.

## Migration Plan

1. Se publican el controlador, el diálogo y las acciones; el catálogo existente sigue funcionando.
2. Reversión: retirar el botón y el diálogo de la tabla, y restaurar el script del diálogo de roles. El backend no cambia.
