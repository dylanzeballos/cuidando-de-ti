## Context

`/admin/inventario` se renderiza en el servidor con la sesión BFF y el cliente autenticado de `catalog-api`. El backend expone sucursales, stock por producto, movimientos y transferencias. La pantalla actual no tiene filtros, métricas ni transferencias, y sus formularios ocupan la página completa.

## Goals / Non-Goals

**Goals:**

- Operar existencias por sucursal con métricas, búsqueda y filtros de estado.
- Registrar entradas, salidas, ajustes y transferencias sin hidratar React.
- Mantener el patrón BFF: tokens solo en el servidor y empresa implícita.
- Ofrecer una lectura clara y responsive en móvil.

**Non-Goals:**

- Edición de productos/categorías, compras, proveedores o facturación.
- Optimizar el N+1 de stock mientras el backend no publique un listado masivo.
- Transferencias parciales o reservas de stock.

## Decisions

### Stock por sucursal en el servidor

La página carga sucursales y productos activos, y consulta el stock de cada producto para la sucursal seleccionada. El resultado se guarda en un `Map` y se filtra en el servidor antes de renderizar. Es un N+1 acotado por el tamaño del catálogo; se reemplazará cuando exista un endpoint masivo.

### Formularios PRG sin hidratación

Sucursal, movimiento y transferencia son formularios HTML `POST` que se resuelven en la misma ruta con `request.formData()`, validación de servidor y redirección 303 con `ok`/`error` y `form` para reabrir el formulario correspondiente. No se hidrata React.

### Transferencias

`POST /admin/inventario` con `action=transfer` valida origen, destino, producto y cantidad > 0, exige sucursales distintas y llama a `POST /api/v1/inventory/transfers`. El backend conserva la autoridad sobre stock insuficiente y conflictos.

### Estados y accesibilidad

Cada producto recibe un estado (`sin registro`, `agotado`, `bajo`, `disponible`) con umbral de 10 unidades. La tabla usa `data-label` y se convierte en tarjetas apiladas por debajo de 640 px. Los formularios se pliegan en `<details>` y se abren cuando su envío falla.

## Risks / Trade-offs

- [N+1 de stock] → Aceptable para catálogos pequeños; se documenta y se sustituirá por un endpoint masivo.
- [Dos sucursales para transferir] → Si solo existe una, el formulario no tiene destino; se muestra el estado vacío correspondiente.
- [Conflictos de stock] → La UI no calcula disponibilidad autoritativa; muestra el error del backend.

## Migration Plan

1. Se publican los componentes de inventario y la ruta actualizada.
2. Reversión: restaurar `inventario.astro` y retirar `inventory.css` y componentes; el backend no cambia.
