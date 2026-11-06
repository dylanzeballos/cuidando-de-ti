# Contrato de facturación de la empresa (v1) - vista del frontend

El contrato canónico vive en el backend hermano:
`../plataforma-core-api/docs/contracts/empresa-billing-v1.md`. Este documento
resume lo que consume el panel; no redefine el contrato.

## Regla del NIT

- Venta con NIT y `invoiceRequired = true` → documento fiscal `PENDING`.
- Venta sin NIT → comprobante interno, sin documento fiscal.
- Anular la venta anula el documento asociado.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/v1/billing/documents?status=&q=&from=&to=&page=&size=` | Listado paginado. |
| `GET` | `/api/v1/billing/documents/summary` | Conteos e importes por estado. |
| `GET` | `/api/v1/billing/documents/{id}` | Detalle con líneas y bitácora. |
| `GET` | `/api/v1/billing/documents/by-sale/{saleId}` | Documento de una venta. |
| `POST` | `/api/v1/billing/documents/{id}/submit` | Envía o reintenta al SIAT. |
| `POST` | `/api/v1/billing/documents/{id}/cancel` | Anula con `{ reason }`. |

## Estados

`PENDING`, `PROCESSING`, `PROCESSED`, `OBSERVED`, `REJECTED`, `FAILED`,
`CANCELLED`.

`PENDING`, `OBSERVED` y `FAILED` admiten reenvío. Todos salvo `CANCELLED` y
`PROCESSING` admiten anulación con motivo.

## Uso desde el frontend

- `src/lib/billing/billing-api.ts` es el cliente de servidor; traduce `400`,
  `401/403`, `404`, `409`, `5xx` y fallos de red a un resultado discriminado.
- `src/lib/billing/billing-types.ts` contiene los tipos.
- `src/lib/billing/labels.ts` centraliza etiquetas, descripciones y tonos.
- `src/lib/billing/validation.ts` es la validación compartida del NIT entre el
  POS y `POST /admin/ventas/registrar`.
- `/admin/facturacion` usa SSR sin islas; el detalle y la factura imprimible no
  hidratan JavaScript.
