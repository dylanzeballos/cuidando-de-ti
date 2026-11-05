# Roadmap del ERP

Estado del panel de administración y próximos bloques para completar el ERP de la
farmacia antes de integrar la facturación.

## Implementado

- **Identidad**: sesión BFF, usuarios, roles y permisos, refresh de token.
- **Catálogo**: categorías, productos, precios, impuesto y filtros; edición de
  producto en modal, activar/desactivar productos y categorías.
- **Inventario**: sucursales, stock por sucursal, movimientos (entrada, salida,
  ajuste), transferencias entre sucursales, filtros por estado y stock bajo.
- **Ventas y caja**: turnos, punto de venta, historial, detalle, anulación,
  devoluciones y comprobante.
- **Costos y gastos**: costo vigente por producto, márgenes, gastos por periodo.
- **Reportes**: KPIs, series, cobros, top productos, inventario y márgenes.
- **Responsive**: drawer móvil, tablas en tarjetas y formularios apilados.

## Próximos cambios (en orden)

### 1. Compras y proveedores

- **Backend**: nuevo módulo de compras (proveedor, orden de compra, recepción,
  costo de compra). Hoy no existe.
- **Frontend**: alta de proveedores, recepción de mercadería que incrementa stock
  y actualiza costo vigente.
- **Dependencia**: endpoint de compras y contrato publicado.

### 2. Clientes y CRM

- **Backend**: módulo de clientes, contacto, historial y crédito. Hoy el módulo
  es un placeholder.
- **Frontend**: directorio, ficha, historial de compras y saldos.

### 3. Facturación

- **Backend**: contrato fiscal (facturas, notas de crédito, series, impuestos).
- **Frontend**: emisión desde ventas, consulta de documentos y estados fiscales.
- **Orden**: último bloque, cuando catálogo, inventario, compras y ventas estén
  estables; la facturación consume esos datos.

## Reglas para cada bloque

- Un cambio OpenSpec por capacidad, con proposal, design, tasks y spec.
- Validación de servidor antes de llamar a la API y mensajes accionables.
- Reutilizar primitivas, clientes de `src/lib` y tokens; sin duplicar estilos.
- Archivos por debajo de 200 líneas (ver `AGENTS.md`).
- Verificar mobile real a 390 px y ejecutar el detector de Impeccable.
