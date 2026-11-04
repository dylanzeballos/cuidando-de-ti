# Contrato de costos y gastos de la empresa (v1) — vista del frontend

El contrato canónico vive en el backend hermano:
`../plataforma-core-api/docs/contracts/empresa-costs-v1.md`. **Aún no está
publicado**; este documento fija la forma esperada, alineada con el fixture local
`src/lib/admin/costs-fixture.ts`, y describe cómo la consumirá `plataforma-web`
con el patrón BFF. Cuando el backend publique su contrato, se alinean rutas y
campos sin cambiar los requisitos de `specs/admin-costs/spec.md`.

Una instalación sirve a **una sola empresa**: la empresa es implícita y no se
selecciona por petición. Estas rutas no aceptan ni requieren identificador ni
encabezado de selección de empresa; cualquier valor enviado (`X-Tenant-Slug`, un
campo `empresaId`, etc.) se ignora. El navegador nunca recibe tokens: las páginas
resuelven la empresa desde la sesión de servidor (`Astro.locals`) y usan el
cliente de servidor.

## Autorización

Todas las rutas exigen `Authorization: Bearer <accessToken>` de una cuenta activa
con el permiso efectivo `costs.manage` y el módulo `costs` habilitado en la
empresa. La decisión se toma en el servidor; el cliente nunca declara sus
permisos. Sin token válido → `401`; sin permiso o módulo → `403`. La visibilidad
del módulo en la navegación es presentación, no autorización.

## Endpoints

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/api/v1/costs` | — (`branchId`, `productId`) | `200` `CostResponse[]` |
| `POST` | `/api/v1/costs` | `{ productId, branchId, amount, validFrom? }` | `201` `CostResponse` |
| `GET` | `/api/v1/costs/expenses` | — (`period`) | `200` `ExpenseSummaryResponse` |
| `POST` | `/api/v1/costs/expenses` | `{ concept, amount, period }` | `201` `ExpenseResponse` |

Formas comunes:

```json
{ "id": "<uuid>", "productId": "<uuid>", "branchId": "<uuid>", "amount": 6.00,
  "currency": "BOB", "validFrom": "2026-10-01", "validTo": null,
  "createdBy": "<uuid>", "createdAt": "<iso>" }
{ "period": "2026-10", "currency": "BOB", "total": 1250.00,
  "items": [
    { "id": "<uuid>", "concept": "Alquiler", "amount": 800.00,
      "period": "2026-10", "createdBy": "<uuid>", "createdAt": "<iso>" }
  ] }
```

`amount` es un monto no negativo en la moneda de la empresa (`currency`, `BOB`).
`validFrom`/`validTo` son la **vigencia** del costo de compra; `validTo` nulo
significa vigente sin fecha de fin. Un costo es de **un producto en una
sucursal**; la sucursal se elige entre las de la empresa
(`/api/v1/inventory/branches`) y no implica selección de empresa.

`period` identifica un **mes calendario** con el formato `YYYY-MM`. La
granularidad del periodo (mes calendario frente a rango de fechas libre) se
confirma al publicarse el contrato canónico; mientras tanto el frontend y el
fixture usan `YYYY-MM` y no cambia el enfoque ni la descomposición de tareas.

Errores en `application/problem+json` (RFC 7807) con `detail`:

- `400` cuerpo o campos inválidos (monto negativo, campos faltantes, `productId`
  o `branchId` vacíos, `period` con formato inválido).
- `404` recurso inexistente (producto o sucursal desconocidos, periodo sin
  registros si el backend decidiera responderlo así; el frontend prefiere un
  resumen vacío con total cero).
- `409` conflicto (vigencia solapada para el mismo producto/sucursal, gasto
  duplicado en el periodo).
- `5xx` o fallo de red: error temporal, sin datos.

## Uso desde el frontend (BFF)

- `src/lib/admin/costs-api.ts` (cliente de servidor) traduce las respuestas a un
  resultado discriminado `ok` / `validation` / `conflict` / `unauthorized` /
  `notFound` / `unavailable`. Un `400` es `validation`, `401`/`403` es
  `unauthorized`, `404` es `notFound`, `409` es `conflict`; un `5xx`, un fallo de
  red o un tiempo de espera agotado es `unavailable`. Nunca lanza.
- La empresa y el token provienen de la sesión de servidor; el cliente recibe la
  empresa resuelta en el servidor y **no** la envía como cabecera ni parámetro.
- `src/lib/admin/costs-fixture.ts` ofrece un fixture local con la forma del
  contrato (productos con precio, costos por sucursal y gastos por periodo). Se
  usa solo en desarrollo y con activación explícita (`COSTS_FIXTURE=true`); en
  cualquier otro caso la aplicación consume el contrato real y ante un fallo
  muestra un estado neutro sin datos.
- `src/lib/admin/costs-validation.ts` concentra la validación de servidor de los
  formularios (campos obligatorios y montos no negativos) como funciones puras,
  de modo que un dato inválido se rechaza **antes** de llamar a la API.
- `/admin/costos` y `/admin/gastos` se renderizan en servidor sin hidratación de
  React, con `Cache-Control: no-store` y `noindex` (middleware de `/admin/**`).

## Notas de interpretación

- El **margen** frente al precio de venta se calcula en la página SSR a partir
  del precio vigente del catálogo (`unitPrice` de `/api/v1/catalog/products`) y
  del costo de compra más reciente del producto en la sucursal elegida. No se
  hidrata React para calcularlo, de modo que el HTML servido ya lo muestra.
  Se distingue **sin costo registrado** (no se presenta margen) de **margen
  cero** (costo igual al precio) y un **margen negativo** se muestra de forma
  explícita, sin ocultarlo.
- "Costo más reciente" es la entrada con mayor `validFrom`; ante un empate, la de
  mayor `createdAt`. La vigencia (`validTo`) se muestra como información y no
  excluye por sí sola un costo del cálculo.
- El **total del periodo** lo dicta el backend en `ExpenseSummaryResponse.total`;
  el frontend no lo recalcula para decidir el resultado mostrado.
