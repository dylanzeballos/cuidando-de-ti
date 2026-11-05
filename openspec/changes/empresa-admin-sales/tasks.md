# Tareas

## 1. Contrato, cliente y cálculos de ventas

- [x] 1.1 Redactar `docs/contracts/empresa-sales-v1.md` (turnos, ventas, pagos, anulación, devoluciones y ticket) alineado con la forma esperada del backend hermano; verificar que documenta autenticación por sesión, empresa de la instalación y códigos de error.
- [x] 1.2 Crear `src/lib/sales/sales-api.ts` con el cliente de servidor tipado (`createSalesClient` con `FetchLike` inyectable) que traduce las respuestas a `ok`/`validation`/`conflict`/`unauthorized`/`notFound`/`unavailable` sin lanzar; verificar con pruebas Vitest que usan un `fetch` inyectado.
- [x] 1.3 Crear `src/lib/sales/fixtures.ts` con la forma del contrato (turno, venta, devolución y ticket) para desarrollar y probar mientras el backend no publica el contrato; verificar que las pruebas del cliente pasan contra el fixture.
- [x] 1.4 Implementar los cálculos del detalle de venta como funciones puras en `src/lib/sales/cart.ts` (total por línea, impuestos y total de la venta); verificar con pruebas Vitest de cantidades, impuestos y redondeo.
- [x] 1.5 Añadir el módulo `sales` al catálogo de presentación de `src/lib/module-catalog.ts` (etiqueta y descripción) y comprobar que la navegación del shell lo muestra solo cuando está habilitado.

## 2. Caja (turno)

- [x] 2.1 Implementar la apertura de caja con monto inicial validado en servidor dentro del shell; verificar con backend simulado que un monto válido crea el turno y que un monto inválido no lo crea.
- [x] 2.2 Implementar el cierre de caja con su resumen (cantidad de ventas, total por método de pago y monto de cierre); verificar que el resumen coincide con las ventas del turno y que el turno deja de aceptar ventas.
- [x] 2.3 Impedir registrar ventas sin turno abierto y mostrar el estado correspondiente; verificar que la pantalla de ventas guía a abrir la caja primero.

## 3. Armado y registro de la venta (isla React)

- [x] 3.1 Implementar la isla React de armado de venta con shadcn/ui (`src/components/sales/`): buscador de productos del catálogo, línea con cantidad, total recalculado y selección de método de pago, hidratada con `client:load`; verificar que el total refleja las líneas y que la pantalla es operable por teclado.
- [x] 3.2 Implementar el endpoint de servidor que registra la venta leyendo `Astro.session` y la empresa de la instalación, y llamando al cliente de ventas; verificar que no recibe la empresa del navegador y que no expone tokens.
- [x] 3.3 Validar el armado (venta vacía o cantidad inválida) y manejar el conflicto de stock (`409`) con mensajes legibles; verificar que no se registra venta ante error y que el error se anuncia a la tecnología de asistencia.
- [x] 3.4 Anunciar el cambio de total y los errores y respetar la preferencia de movimiento reducido; verificar el foco visible y el orden de tabulación de los controles del POS.

## 4. Ticket, historial y detalle

- [x] 4.1 Implementar la emisión del ticket de una venta registrada (folio, fecha, líneas, impuestos, total y método de pago) en servidor, imprimible; verificar el contenido del ticket para una venta de ejemplo.
- [x] 4.2 Implementar el historial de ventas en servidor con folio, fecha, total, método de pago y estado, más el estado vacío; verificar que una empresa sin ventas muestra el estado vacío sin datos.
- [x] 4.3 Implementar el detalle de venta con sus líneas, método de pago, totales, devoluciones asociadas y acceso al ticket; verificar que el detalle coincide con la venta del historial.

## 5. Anulación y devoluciones

- [x] 5.1 Implementar la anulación de una venta registrada y su reflejo en el historial y el detalle; verificar que una venta anulada muestra su estado y que anular de nuevo se bloquea con un mensaje legible.
- [x] 5.2 Implementar el registro de devoluciones parciales o totales asociadas a una venta; verificar que el detalle refleja el importe devuelto y que una devolución mayor a lo vendido se bloquea sin reintegrar stock.

## 6. Integración y verificación

- [x] 6.1 Confirmar que historial, detalle, ticket y caja se renderizan en servidor sin hidratación y que solo el armado de venta hidrata React; verificar inspeccionando el HTML servido.
- [x] 6.2 Aplicar `Cache-Control: no-store` y `noindex` a las rutas de ventas y comprobar que el HTML y el JavaScript servidos no contienen tokens ni la empresa de la instalación.
- [x] 6.3 Actualizar `README.md`/`DESIGN.md` con el flujo de ventas y el uso de la isla del POS, y ejecutar `npm run check`, `npm test` y `npm run build` con 0 errores.
