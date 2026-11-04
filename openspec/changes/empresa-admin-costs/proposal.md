# Administración de costos y gastos operativos

## Why

Una empresa necesita saber cuánto le cuesta cada producto y cuánto gasta operar cada periodo para decidir precios y controlar el negocio. Hoy la administración registra el catálogo y el inventario, pero no puede fijar el costo de compra por producto y sucursal, ver el margen frente al precio de venta, ni registrar y totalizar sus gastos operativos. La farmacia "Cuidando de Ti" es el primer caso concreto: sin costos confiables no puede evaluar la rentabilidad de su catálogo.

## What Changes

- Añadir la pantalla `/admin/costos` (SSR) que lista productos con su costo de compra y su precio de venta, muestra el margen calculado y permite registrar o actualizar el costo por producto y sucursal.
- Añadir la pantalla `/admin/gastos` que registra gastos y costos operativos por periodo, con su listado y totales.
- Reutilizar el shell y la sesión de `empresa-app-foundation`: patrón BFF, el navegador nunca recibe tokens, y la empresa es la de la instalación.
- Resolver los estados de carga, vacío y error con las primitivas del sistema de diseño, con HTML semántico, foco visible y movimiento reducido.
- Desarrollar contra un fixture local mientras se publica el contrato `docs/contracts/empresa-costs-v1.md` del backend hermano.

## Capabilities

### New Capabilities

- `admin-costs`: registro del costo de compra por producto y sucursal con comparación frente al precio de venta y margen, y registro de gastos y costos operativos por periodo con listado y totales.

### Modified Capabilities

<!-- Ninguna: no cambian los requisitos de `catalog-admin`; el costo por producto y sucursal se añade como capacidad nueva y no altera el comportamiento de negocio del catálogo. -->

## Impact

- Nuevas páginas `src/pages/admin/costos.astro` y `src/pages/admin/gastos.astro`, dentro del shell de `empresa-app-foundation`.
- Nuevo cliente de servidor en `src/lib/admin/costs-api.ts` (tipos, DTO y mapeo a `ok`/`validation`/`conflict`/`unavailable`) y un fixture local en `src/lib/admin/costs-fixture.ts` para el desarrollo sin backend.
- Añade el módulo `costs` al registro de presentación (`src/lib/module-catalog.ts`) sin incrustar datos de una empresa concreta.
- Reutiliza los tokens y las primitivas de `design-system`, el shell de `admin-shell` y la sesión de `session-auth`; no introduce autenticación propia.
- Ninguna variable `PUBLIC_` nueva: la URL y las credenciales de la API se resuelven solo en el servidor.

### Modelo de despliegue

- Una instalación y una base de datos dedicada por empresa; una sola empresa por instalación.
- No existe el concepto "tenant" ni un selector de empresa: la empresa es implícita de la instalación y el navegador nunca la elige.
- Activar o desactivar el módulo de costos es configuración de cada empresa, no código nuevo.

### Exclusiones

- Facturación, sistema contable, impuestos y cierres fiscales (se abordarán con APIs propias más adelante).
- Costeo por lote, FIFO o promedio ponderado, y valuación de inventario: solo se registra el costo de compra vigente por producto y sucursal.
- Aprobaciones, presupuestos, proveedores y órdenes de compra.
- POS/ventas y reportes analíticos avanzados.

### Dependencies

- `empresa-app-foundation` entrega el shell, el sistema de diseño y la sesión BFF que este cambio reutiliza; sin él no hay navegación ni identidad.
- Catálogo de productos (SKU, nombre, unidad, precio de venta) y sucursales del contrato `docs/contracts/catalog-inventory-v1.md`.
- Contrato de costos del backend hermano `docs/contracts/empresa-costs-v1.md` (costos por producto/sucursal y gastos operativos por periodo), que se publicará; mientras no exista, el desarrollo usa un fixture local con su forma.

### Rollback

- Reversión: eliminar `src/pages/admin/costos.astro`, `src/pages/admin/gastos.astro`, el cliente `src/lib/admin/costs-api.ts`, el fixture y la entrada `costs` del registro de módulos. El shell, la sesión y el catálogo existentes no se modifican y el resto del sitio no se ve afectado.
