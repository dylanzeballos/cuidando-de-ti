# Registro de venta: caja, ventas, comprobantes, anulación y devoluciones

## Why

Con el catálogo, el inventario y la fundación de la aplicación ya definidos, a la farmacia "Cuidando de Ti" todavía le falta la operación comercial esencial: cobrar. Sin un registro de venta que abra la caja, arme una venta, cobre, emita el comprobante y permita anular o devolver, la plataforma no puede reemplazar la caja actual ni generar los datos que después consumirán la facturación y la contabilidad. Este cambio cierra ese hueco reutilizando el shell, la sesión y el sistema de diseño de `empresa-app-foundation`.

## What Changes

- Añadir el **turno de caja**: abrir una caja con un monto inicial, operar ventas asociadas al turno y cerrarla con un resumen (ventas, totales por método de pago y arqueo).
- Añadir el **armado de una venta**: buscar y agregar productos del catálogo, ajustar cantidades, ver el total recalculado en vivo y elegir el método de pago.
- **Emitir un ticket/comprobante** de cada venta registrada, imprimible o consultable, con folio, líneas, impuestos, total y método de pago.
- Añadir el **historial de ventas** con filtros por fecha, caja y estado, y el **detalle** de cada venta.
- Añadir **anulación** de una venta registrada y **registro de devoluciones** parciales o totales que reintegran stock.
- **Isla React con shadcn/ui hidratada solo en el registro de venta** (armado de venta) porque requiere estado en cliente (detalle de venta, cantidades, total y método de pago); el resto de las pantallas de ventas se renderizan en servidor sin hidratación.
- Modelo sin tenant: la empresa es la de la instalación y sus operaciones se resuelven desde la sesión de servidor, nunca desde un valor enviado por el navegador.

## Capabilities

### New Capabilities

- `admin-sales`: turnos de caja, armado y registro de ventas, emisión de ticket, historial y detalle, anulación y devoluciones, con la isla React del POS y accesibilidad.

### Modified Capabilities

<!-- Ninguna: no hay capacidades archivadas en `openspec/specs/`. Este cambio solo añade la operación de ventas; reutiliza el shell, la sesión y el sistema de diseño definidos en `empresa-app-foundation` sin cambiar sus requisitos. -->

## Impact

- Nuevas páginas de administración dentro del shell protegido: POS de armado de venta, historial de ventas, detalle de venta y caja (apertura, cierre y resumen).
- Nueva isla React con shadcn/ui para el armado de la venta en `src/components/sales/` (hidratada con `client:load`), reutilizando `src/components/ui`; el historial, el detalle y la caja se renderizan en servidor.
- Nuevo cliente de servidor tipado para el contrato de ventas (turnos, ventas, pagos, anulación y devoluciones) que consume la sesión de `empresa-app-foundation`; el navegador nunca recibe tokens (patrón BFF).
- Reutiliza el catálogo de productos (`src/lib/admin/catalog-api.ts`) para buscar y agregar líneas, y el shell/sesión/middleware de `empresa-app-foundation`.
- Nuevo módulo `sales` en el catálogo de presentación de módulos para que la navegación lo muestre solo cuando la empresa lo tenga habilitado.
- Nuevas pruebas Vitest para los cálculos del detalle de venta, la traducción de estados de la API y la generación del comprobante; verificación de accesibilidad por teclado y foco visible.

### Exclusiones

- Facturación fiscal, notas fiscales electrónicas (SIAT) y sistema contable; consumirán APIs propias en cambios posteriores.
- Compras y proveedores, promociones, listas de precios, lotes y fechas de vencimiento.
- Pagos con tarjeta o integraciones con pasarelas; el método de pago se registra como dato de la venta.
- Apertura de caja por usuario distinto del de la sesión y arqueos parciales con múltiples operadores simultáneos.

### Dependencies

- `empresa-app-foundation`: shell de administración, sesión de servidor (BFF), sistema de diseño y protección de rutas `/admin/**`. Es el marco que este cambio reutiliza; sin él no hay sesión ni shell.
- `supermarket-admin-catalog` / catálogo de productos: el POS lee productos y sus precios desde el catálogo existente.
- Backend hermano: contrato `docs/contracts/empresa-sales-v1.md` (turnos, ventas, pagos, anulación y devoluciones) que publicará el cambio de ventas del backend. Mientras no exista, el frontend se desarrolla contra un fixture local que replica su forma.

### Rollback

- Reversión: retirar las rutas de ventas, la isla del POS y su cliente, y quitar el módulo `sales` del catálogo de presentación; el shell, la sesión, el catálogo y el inventario siguen funcionando. No se almacena estado de caja ni de venta en el navegador como autoridad; el rollback no toca datos de otras capacidades.
