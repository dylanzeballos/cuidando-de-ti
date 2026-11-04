## Context

`plataforma-web` renderiza en servidor con `output: server` y el adaptador de Node, resuelve la empresa por dominio y ya tiene páginas de administración que operan catálogo e inventario contra la API del backend hermano con patrón BFF. El cambio `empresa-app-foundation` (en curso) introduce el sistema de diseño, el shell modular y la sesión de servidor que este cambio MUST reutilizar; el cliente de administración vigente (`src/lib/admin/catalog-api.ts`) devuelve un resultado discriminado `AdminResult<T>` y acepta un `fetchImpl` inyectable para pruebas, y existe el patrón de fixtures en `src/lib/fixtures.ts`.

El backend hermano solo publica hoy `docs/contracts/tenant-site-v1.md` y `docs/contracts/catalog-inventory-v1.md`; el contrato de costos `docs/contracts/empresa-costs-v1.md` **no existe todavía** y se publicará más adelante. Ver `proposal.md` para la motivación y `specs/admin-costs/spec.md` para los requisitos.

## Goals / Non-Goals

**Goals:**

- Reutilizar el shell, la sesión BFF y las primitivas de `empresa-app-foundation` sin introducir autenticación ni layout propios.
- Datos tipados y verificables para costos por producto/sucursal y gastos operativos, con cálculo de margen del lado del servidor.
- Desarrollo y pruebas sin depender del backend real, con un fixture que replique la forma del contrato.
- Empresa implícita de la instalación: se toma de la sesión, nunca del navegador.

**Non-Goals:**

- Facturación, contabilidad, impuestos y cierres fiscales.
- Costeo por lote, FIFO o promedio ponderado, y valuación de inventario.
- Aprovisionamiento o instalación por cliente (operativo).
- Modificar los componentes generados de shadcn/ui más allá de composición.

## Decisions

### Cliente de servidor propio en `src/lib/admin/costs-api.ts`

Se replica el patrón de `src/lib/admin/catalog-api.ts` con un `createCostsClient(options)` que recibe `baseUrl`, `token`, `empresa` y un `fetchImpl` inyectable, y devuelve un resultado discriminado (`ok`/`validation`/`conflict`/`unauthorized`/`notFound`/`unavailable`) para que las páginas no manejen excepciones. Se prefiere un módulo separado a extender el cliente de catálogo porque los recursos y el contrato son distintos y así el cambio es aislable y revertible. La empresa y el token provienen de la sesión resuelta por `empresa-app-foundation` (`Astro.locals`), no de un selector ni del navegador.

### Entidad "empresa", no "tenant"

El cambio no introduce el término "tenant". La empresa es la de la instalación y se resuelve desde la sesión de servidor; no hay parámetro de empresa en la URL ni en el cuerpo de las peticiones del navegador. Alternativa descartada: reutilizar `X-Tenant-Slug` desde variables de entorno fijas, que contradice el modelo de una sola empresa por instalación y la sesión de servidor.

### Cálculo del margen en el servidor

El margen por producto y sucursal se calcula en la página SSR a partir del precio de venta del catálogo y del costo más reciente registrado, no en el navegador. Así el HTML servido ya muestra el margen, funciona sin JavaScript y una actualización de datos no puede producir un margen inconsistente. Se distingue "sin costo registrado" de "margen cero"; un margen negativo se muestra explícitamente. Alternativa descartada: derivar el margen en cliente, que exigiría hidratar React para contenido estático y duplicaría la regla de negocio.

### Formularios con patrón POST-redirect-GET y validación en servidor

Los formularios de costo y de gasto siguen el patrón ya usado en `src/pages/admin/catalogo.astro`: `POST` a la misma ruta, validación en servidor, llamada al cliente de costos y redirección `303` con un mensaje en `query` (`ok`/`error`) que la página renderiza de forma accesible. Los mensajes se devuelven a una región con `role="status"`/`aria-live` sin depender del color. La validación de campos obligatorios y montos no negativos ocurre antes de llamar a la API; los errores del backend (unicidad, conflicto) se muestran tal cual. Alternativa descartada: islas React hidratadas, que no aportan valor en formularios de servidor y aumentan el JavaScript enviado.

### Fixture local mientras no exista el contrato

Se crea `src/lib/admin/costs-fixture.ts` con un `FetchLike` que responde a las rutas de costos y gastos con datos de ejemplo y los estados de error (`400`, `409`, `500`), siguiendo el estilo de `src/lib/fixtures.ts` (`fixtureFetch`, `staticFetch`, `failingFetch`). Las pruebas del cliente lo usan cuando no hay backend. El contrato `docs/contracts/empresa-costs-v1.md` queda como dependencia explícita: cuando se publique, se alinean rutas y campos sin cambiar los requisitos.

### Módulo `costs` en el registro de presentación

Se añade la entrada `costs` a `src/lib/module-catalog.ts` (código → etiqueta, icono y ruta) para que el shell y el panel de `empresa-app-foundation` muestren el acceso solo cuando la empresa tiene el módulo habilitado. La visibilidad no autoriza: el backend sigue autorizando cada operación.

### SSR, caché y estados

Las rutas `/admin/costos` y `/admin/gastos` se renderizan siempre en servidor, con `Cache-Control: no-store` y `noindex`, sin hidratación de React para contenido estático. Los estados de carga, vacío y error se resuelven con las primitivas del sistema de diseño; ante fallo o indisponibilidad de la API `unavailable` se muestra un mensaje neutro y ninguna lista con datos.

## Risks / Trade-offs

- [El contrato `empresa-costs-v1.md` no existe] → Se define la forma esperada en el fixture y se aísla en un módulo; cuando el backend publique el contrato, se ajusta el mapeo sin tocar specs ni páginas.
- [`empresa-app-foundation` aún no está implementado] → Este cambio depende del shell y la sesión; se implementa después de esa fundación o con las primitivas disponibles, y el diseño fija la interfaz esperada (`Astro.locals` con empresa y cliente de sesión).
- [Riesgo de reutilizar el token fijo de desarrollo del catálogo] → El cliente de costos MUST tomar la empresa y el token de la sesión BFF; no se añaden variables `ADMIN_*` nuevas ni `PUBLIC_` con credenciales.
- [Definiciones ambiguas de "costo" y "periodo"] → Los requisitos fijan costo de compra no negativo por producto/sucursal y gasto con concepto, monto y periodo; el costeo avanzado queda excluido.
- [Divergencia entre el margen mostrado y el precio vigente] → El margen se calcula en la misma lectura que el listado, para que ambos valores provengan del mismo instante.

## Migration Plan

1. Añadir la entrada `costs` al registro de módulos y el cliente `costs-api.ts` con sus pruebas contra el fixture.
2. Implementar `/admin/costos` (listado, costo por producto/sucursal y margen) dentro del shell y la sesión.
3. Implementar `/admin/gastos` (registro, listado y total por periodo).
4. Aplicar estados de carga/vacío/error, accesibilidad y `Cache-Control: no-store`/`noindex`.
5. Al publicarse `docs/contracts/empresa-costs-v1.md`, alinear rutas y campos y retirar el fixture del camino por defecto.
6. Reversión: eliminar las dos páginas, el cliente, el fixture y la entrada `costs` del registro; el shell, la sesión y el catálogo existentes no se modifican.

## Open Questions

- La granularidad del periodo (mes calendario frente a rango de fechas libre) se resolverá al publicarse el contrato; no cambia los requisitos, el enfoque ni la descomposición de tareas.
