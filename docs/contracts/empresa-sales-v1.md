# Contrato de ventas y caja de la empresa (v1) — vista del frontend

El contrato canónico vive en el backend hermano:
`../plataforma-core-api/docs/contracts/empresa-sales-v1.md`. Este documento
resume el contrato publicado y describe cómo lo consume `plataforma-web` con el
patrón BFF; no lo redefine ni lo duplica.

Una instalación sirve a **una sola empresa**: la empresa es implícita y no se
selecciona por petición. Estas rutas no aceptan ni requieren identificador ni
encabezado de selección de empresa; cualquier valor enviado (`X-Tenant-Slug`, un
campo `empresaId`, etc.) se ignora. El navegador nunca recibe tokens: la isla del
POS llama a endpoints de Astro que conservan la sesión y resuelven la empresa.

## Autorización

Todas las rutas exigen `Authorization: Bearer <accessToken>` de una cuenta activa
con el permiso efectivo `sales.manage` y el módulo `sales` habilitado en la
empresa. La decisión se toma en el servidor; el cliente nunca declara sus
permisos. Sin token válido → `401`; sin permiso o módulo → `403`.

## Endpoints

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `POST` | `/api/v1/sales/cash-sessions` | `{ branchId, initialAmount }` | `201` `CashSessionResponse` |
| `GET` | `/api/v1/sales/cash-sessions` | — (`status`, `branchId`) | `200` `CashSessionResponse[]` |
| `GET` | `/api/v1/sales/cash-sessions/{id}` | — | `200` `CashSessionResponse` |
| `POST` | `/api/v1/sales/cash-sessions/{id}/close` | `{ countedAmount }` | `200` `CashSessionResponse` |
| `POST` | `/api/v1/sales` | `{ branchId, items, discount?, payments }` + `Idempotency-Key` | `201` / `200` (clave repetida) `SaleResponse` |
| `GET` | `/api/v1/sales` | — (`from`, `to`, `branchId`, `cashSessionId`, `status`, `page`, `size`) | `200` `PageResponse<SaleResponse>` |
| `GET` | `/api/v1/sales/{id}` | — | `200` `SaleResponse` |
| `GET` | `/api/v1/sales/{id}/receipt` | — | `200` `ReceiptResponse` |
| `POST` | `/api/v1/sales/{id}/annul` | `{ reason? }` | `200` `SaleResponse` |
| `GET` | `/api/v1/sales/{id}/returns` | — | `200` `SaleReturnResponse[]` |
| `POST` | `/api/v1/sales/{id}/returns` | `{ items, reason? }` | `201` `SaleReturnResponse` |

Formas comunes:

```json
{ "id": "<uuid>", "branchId": "<uuid>", "openedBy": "<uuid>", "initialAmount": 200.00,
  "status": "OPEN", "openedAt": "<iso>", "closedBy": null, "closedAt": null,
  "expectedAmount": null, "countedAmount": null, "difference": null,
  "saleCount": 0, "totalsByPaymentMethod": {} }
{ "id": "<uuid>", "number": 1, "branchId": "<uuid>", "cashSessionId": "<uuid>",
  "status": "COMPLETED", "currency": "BOB", "subtotal": 17.00, "discountTotal": 2.00,
  "total": 15.00, "paidTotal": 15.00, "createdBy": "<uuid>", "createdAt": "<iso>",
  "annulledAt": null, "annulledBy": null, "annulReason": null,
  "items": [ { "id": "<uuid>", "lineNumber": 1, "productId": "<uuid>", "sku": "AGUA-2L",
    "name": "Agua 2L", "unit": "UNIT", "quantity": 2.000, "unitPrice": 8.50,
    "discount": 0.00, "lineTotal": 17.00 } ],
  "payments": [ { "id": "<uuid>", "method": "CASH", "amount": 15.00 } ] }
{ "id": "<uuid>", "saleId": "<uuid>", "total": 8.50, "reason": "producto dañado",
  "createdBy": "<uuid>", "createdAt": "<iso>",
  "items": [ { "id": "<uuid>", "saleItemId": "<uuid>", "quantity": 1.000, "amount": 8.50 } ] }
```

`status` de la venta ∈ `COMPLETED` | `ANNULLED`; de la caja ∈ `OPEN` | `CLOSED`.
Métodos de pago soportados: `CASH` | `CARD` | `TRANSFER` | `QR`. Moneda `BOB`.

`POST /sales` es **idempotente**: exige el encabezado `Idempotency-Key`; un
reintento con la misma clave devuelve la venta ya registrada sin repetir el
descuento de stock. `subtotal` es la suma de `quantity × unitPrice`,
`discountTotal` la suma de descuentos y `total = subtotal − discountTotal`.

Errores en `application/problem+json` (RFC 7807) con `detail`. `400` es cuerpo o
campos inválidos (venta sin ítems, cantidad `≤ 0`, pago que no cubre el total,
falta de `Idempotency-Key`, devolución mayor a lo vendido); `404` recurso
inexistente; `409` conflicto (sucursal sin turno abierto, segundo turno abierto,
turno ya cerrado, venta ya anulada, devolución sobre venta anulada, stock
insuficiente).

## Uso desde el frontend (BFF)

- `src/lib/sales/sales-api.ts` (cliente de servidor) traduce las respuestas a un
  resultado discriminado `ok` / `validation` / `conflict` / `unauthorized` /
  `notFound` / `unavailable`. Un `400` es `validation`, `401`/`403` es
  `unauthorized`, `404` es `notFound`, `409` es `conflict`; un `5xx`, un fallo de
  red o un tiempo de espera agotado es `unavailable`. Nunca lanza.
- `src/lib/sales/fixtures.ts` ofrece un fixture local con la forma del contrato
  (turno, venta, devolución y ticket). Se usa solo en desarrollo y con activación
  explícita (`SALES_FIXTURE=true`); en cualquier otro caso la aplicación consume el
  contrato real y ante un fallo muestra un estado neutro sin datos.
- `src/lib/sales/cart.ts` concentra los cálculos del carrito (total por línea,
  impuestos y total) como funciones puras, compartidas por la isla del POS y por
  la validación del servidor.
- La isla React del POS (`src/components/sales/`) hidrata solo el armado de la
  venta. Llama a `POST /admin/ventas/registrar`, un endpoint de Astro que lee
  `Astro.session`, resuelve la empresa de la instalación y usa el cliente de
  servidor; el navegador nunca recibe el token ni elige la empresa.
- El historial, el detalle, el ticket y la caja se renderizan en servidor sin
  hidratación, con `Cache-Control: no-store` y `noindex` (middleware de
  `/admin/**`).

## Notas de interpretación

- El contrato de ventas no incluye campos fiscales: `unitPrice` es el precio de
  catálogo y `total` es el autoritativo (`subtotal − discountTotal`). El POS
  muestra el impuesto **incluido** en el precio a partir de `taxRate` del catálogo
  (`lineTotal − lineTotal / (1 + taxRate/100)`) solo como desglose informativo; no
  altera el total registrado. La facturación fiscal (SIAT) queda fuera de alcance.
- La apertura de caja y el registro de ventas requieren `branchId`. Como la
  empresa es la de la instalación, la sucursal se elige entre las de la empresa
  (`/api/v1/inventory/branches`) y no implica selección de empresa.
