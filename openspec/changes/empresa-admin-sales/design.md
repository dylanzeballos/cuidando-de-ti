## Context

`plataforma-web` es un frontend Astro 7 con `output: server` que sirve a una sola empresa por instalación. `empresa-app-foundation` define el shell de administración, la sesión de servidor con patrón BFF, el sistema de diseño y la protección de `/admin/**`; `supermarket-admin-catalog` define el catálogo de productos con `src/lib/admin/catalog-api.ts`. Este cambio añade la operación de ventas sobre ese marco. Ver `proposal.md` para la motivación y `specs/admin-sales/spec.md` para los requisitos.

Restricciones vigentes: el navegador nunca recibe tokens ni la empresa; la empresa se deduce de la sesión de servidor; solo se hidrata React donde la interacción lo exige; el backend hermano publicará el contrato `docs/contracts/empresa-sales-v1.md`, aún inexistente.

## Goals / Non-Goals

**Goals:**

- Incorporar el ciclo de venta completo (caja, armado, ticket, historial, anulación y devoluciones) reutilizando el shell y la sesión existentes.
- Confinar la hidratación de React al armado de la venta; el resto en servidor sin JavaScript de React.
- Mantener el patrón BFF: la isla del POS habla con el servidor de Astro, que conserva la sesión y resuelve la empresa.
- Desarrollar contra un fixture local mientras no exista el contrato de ventas, con una forma que se pueda sustituir por el cliente real sin tocar las páginas.

**Non-Goals:**

- Facturación fiscal/SIAT y contabilidad.
- Pasarelas de pago o cobro con tarjeta; el método de pago es un dato de la venta.
- Multiempresa o selector de empresa; la empresa es la de la instalación.
- Compras/proveedores, promociones, listas de precios o lotes.

## Decisions

### Isla React solo para el armado de la venta

El registro de venta necesita estado en cliente (detalle de venta, cantidades, total recalculado y método de pago) con respuesta inmediata, así que el componente de armado se implementa como isla React con shadcn/ui (`src/components/ui`) e hidratación `client:load`. El historial, el detalle, el comprobante y la caja son de solo lectura y se renderizan en servidor sin directiva `client:*`. Alternativa descartada: formularios HTML con recarga por cada línea, que degradan la operación de caja y obligan a viajes al servidor por interacción. Alternativa descartada: hidratar el módulo completo, que carga JavaScript innecesario en pantallas estáticas.

### La isla del POS no habla con el backend directamente

El navegador nunca debe tener el token ni la empresa. La isla llama a un endpoint de Astro (`POST /admin/ventas/...` o una ruta `/api/sales/*` interna) que lee `Astro.session`, resuelve la empresa de la instalación y usa el cliente de servidor tipado contra el backend. La búsqueda de productos del POS también se sirve desde el servidor (el catálogo ya se lee con la sesión). Alternativa descartada: llamar al backend desde el navegador con un token, prohibido por las guías del proyecto.

### Cliente de servidor tipado y resultado discriminado

Se añade `src/lib/sales/sales-api.ts` siguiendo el patrón de `src/lib/admin/catalog-api.ts`: un `createSalesClient` con `FetchLike` inyectable que nunca lanza y traduce las respuestas a un resultado discriminado (`ok`/`validation`/`conflict`/`unauthorized`/`notFound`/`unavailable`). Cubre turnos (abrir, cerrar, resumen), ventas (crear, listar, obtener), anulación, devoluciones y el ticket. Alternativa descartada: lanzar excepciones y capturarlas en cada página, que repite el manejo de errores.

### Fixture local hasta que exista el contrato

`docs/contracts/empresa-sales-v1.md` se redacta alineado con la forma esperada (turnos, ventas, pagos, anulación y devoluciones) y, mientras el backend no lo publique, `src/lib/sales/fixtures.ts` replica esa forma con datos de servidor. Las pruebas usan ese fixture inyectando un `fetch`. Sustituirlo por el cliente real es reemplazar el `baseUrl`/`fetchImpl`, no las páginas. Alternativa descartada: acoplar las páginas a datos de ejemplo incrustados, que impiden la sustitución.

### Cálculos del detalle de venta como funciones puras

El total por línea y el total de la venta se calculan con funciones puras en `src/lib/sales/cart.ts` (probadas con Vitest), separadas de la isla. Así el mismo cálculo se reutiliza en el servidor para validar y en el cliente para mostrar, y se evita divergencia entre lo mostrado y lo registrado.

### Estado del detalle de venta solo en memoria

El detalle de venta vive en el estado de React de la isla y no se persiste en `localStorage` ni cookies: el navegador no es autoridad de una venta. Una recarga descarta el armado en curso. Alternativa descartada: persistir el detalle de venta en el cliente, que permitiría manipular precios o la empresa fuera del servidor.

### SSR, caché y resolución de dominio

Las rutas de ventas viven bajo `/admin/**`, ya protegidas por el middleware de `empresa-app-foundation`: sin sesión redirigen a `/entrar` y con sesión adjuntan la empresa de la instalación a `Astro.locals`. Se renderizan siempre en servidor con `Cache-Control: no-store` y `noindex`. La resolución por dominio sigue siendo la del hostname, como en el resto de la administración; no hay resolución por dominio específica de ventas. La búsqueda de productos del POS se sirve en servidor sin caché para reflejar precios y existencia vigentes.

### Estados de interfaz

El POS, el historial, el detalle y la caja usan las primitivas de estados de `empresa-app-foundation` (carga, vacío y error). El POS muestra el conflicto de stock (`409`) y la validación (`400`) como mensajes legibles; un fallo temporal (`timeout`/`5xx`) se muestra como indisponibilidad neutra sin datos y no se registra venta.

## Risks / Trade-offs

- [El backend aún no emite el contrato de ventas] → Se redacta el contrato y se implementa contra un fixture; la tarea de backend corre en paralelo y el cliente se sustituye sin tocar las páginas.
- [Divergencia entre el total mostrado en el POS y el registrado] → Los cálculos viven en funciones puras compartidas y el servidor valida antes de registrar; el total autoritativo es el del backend.
- [La isla del POS añade JavaScript a una ruta de administración] → Se limita la hidratación al armado de venta; historial, detalle, ticket y caja no hidratan React.
- [Doble envío de una venta desde la caja] → El endpoint deshabilita el envío mientras la venta está en curso y el backend debe idempotenciar por folio/clave de envío; se documenta como requisito del contrato.
- [Devoluciones y anulación afectan inventario] → Se delegan en el backend, que reintegra stock de forma atómica; el frontend solo refleja el resultado y bloquea operaciones inválidas.
- [Método de pago sin pasarela] → Se registra como dato; el cobro real queda fuera de alcance y no se simula una pasarela.

## Migration Plan

1. Redactar `docs/contracts/empresa-sales-v1.md` y crear `src/lib/sales/` (cliente tipado, cálculos puros y fixture) con pruebas Vitest.
2. Añadir `sales` al catálogo de presentación de módulos para que la navegación lo muestre solo si está habilitado.
3. Implementar caja (abrir, cerrar y resumen) e historial y detalle de ventas en servidor dentro del shell.
4. Implementar la isla React del armado de venta con shadcn/ui, el endpoint de registro y la emisión del ticket.
5. Implementar anulación y devoluciones.
6. Aplicar `Cache-Control: no-store` y `noindex`, revisar accesibilidad por teclado y ejecutar `npm run check`, `npm test` y `npm run build`.
7. Reversión: retirar rutas de ventas, isla y cliente, y quitar `sales` del catálogo de presentación; el shell, la sesión, el catálogo y el inventario quedan intactos y no se pierden datos de otras capacidades.
