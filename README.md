# Cuidando de Ti

Frontend de administración de la **farmacia Cuidando de Ti** (una instalación y
una base de datos dedicada) en Astro (SSR) con React para shadcn/ui y Tailwind
CSS v4. La administración usa inicio de sesión real con patrón BFF y resuelve la
empresa del dominio, consultando la configuración pública de la API hermana
(`plataforma-core-api`) para aplicar marca, tema y módulos habilitados. La raíz
(`/`) redirige a `/admin`: no hay portada pública.

## Inicio local

```bash
npm install
npm run dev
```

Validar antes de entregar:

```bash
npm run check   # tipos y diagnósticos de Astro
npm test        # pruebas unitarias con fixtures del contrato
npm run build   # compila el servidor SSR
```

## Sistema de diseño

- **Tipografía**: Inter Variable (`@fontsource-variable/inter`), una sola familia para
  títulos, datos y controles, con cifras tabulares en importes.
- **Tokens globales** en `src/styles/global.css`: color, tipografía, espaciado,
  radios y estados (éxito, aviso, información, error). Los componentes consumen
  tokens, nunca valores literales.
- **Shell de administración**: sidebar con el color principal de la empresa,
  grupos de navegación colapsables (`<details>`) y modo riel para dejar solo
  iconos. El estado se recuerda en `localStorage`, sin hidratar frameworks.
- **Espacios de trabajo**: `src/lib/workspaces.ts` define lentes de interfaz
  (Administración, Ventas, Almacén, Contabilidad) que filtran la navegación por
  módulos. El espacio se resolverá del tipo de usuario autenticado; el selector
  manual se retiró. El backend sigue autorizando cada operación.
- **Tema por empresa mediante tokens**: `src/layouts/base-layout.astro` aplica la
  segunda capa de tokens (`--empresa-primary`, `--empresa-background`,
  `--empresa-foreground`) desde la configuración validada. Un tema con colores no
  hexadecimales o con contraste insuficiente degrada al tema por defecto
  (`src/lib/theme.ts`); nunca se inyecta CSS inseguro.
- **Primitivas reutilizables** en `src/components/primitives/`: contenedor,
  encabezado de sección, panel y estados de carga, vacío y error. Se usan tanto en
  el sitio público como en la administración, sin lógica de negocio ni datos de
  empresa incrustados.
- **Accesibilidad**: HTML semántico, foco visible, contraste suficiente y respeto
  a `prefers-reduced-motion`.

## Variables de entorno

Se documentan en `.env.example`. Las relevantes para el servidor:

- `API_BASE_URL` — URL privada del backend hermano (por ejemplo `http://localhost:8080/api/v1`). Es una variable de servidor: nunca debe llevar el prefijo `PUBLIC_` ni llegar al navegador.
- `DEV_SITE_DOMAIN` — solo desarrollo: dominio de empresa que se resuelve cuando la petición llega por `localhost`/`127.0.0.1`.
- `SITE_FIXTURE` - solo desarrollo: con `true` usa el fixture local de marca y módulos (`src/lib/fixtures.ts`, con `cuidando-de-ti.test`) en lugar de la API real. En producción se ignora.
- `SITE_ALLOWED_DOMAINS` — patrones de hostname que este despliegue confía como `Host` / `X-Forwarded-Host`, separados por comas (`acme.com,*.northwind.com`). Se leen al construir. Sin ellos, Astro ignora la cabecera y usa `localhost`, por lo que la marca no se resolvería por dominio.

Las variables de sesión no se exponen al navegador. La sesión usa el driver de
sistema de archivos del adaptador de Node por defecto; para varias instancias se
configura un driver externo (por ejemplo Redis) sin cambiar el código.

## Sesión (patrón BFF)

- `/entrar` ofrece un formulario accesible sin hidratación. Las credenciales se
  envían por `POST` a `/api/auth/login`, que valida en el servidor, llama a
  `POST /api/v1/auth/login` y guarda identidad y tokens en `Astro.session`.
- El navegador solo recibe la cookie `cuidando_session` (`HttpOnly`,
  `SameSite=Lax`, `Secure` en producción). Ningún token ni credencial llega al
  HTML, al JavaScript ni a variables `PUBLIC_`.
- `POST /api/auth/logout` revoca el token de refresco y destruye la sesión de
  servidor antes de redirigir a `/entrar`.
- `src/middleware.ts` exige sesión para `/admin/**`, redirige a `/entrar` sin
  sesión y adjunta la empresa de la instalación a `Astro.locals`. La empresa se
  deduce en el servidor, nunca de `query` ni `body`.
- Las rutas de sesión y administración responden con `Cache-Control: no-store` y
  `noindex`.

El contrato de autenticación/sesión es `empresa-auth-session-v1`
(`docs/contracts/empresa-auth-session-v1.md`, alineado con el backend hermano).

## Despliegue SSR

El proyecto usa `@astrojs/node` en modo `standalone` (`output: 'server'`). Tras `npm run build`, el servidor se ejecuta con:

```bash
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

El hostname de cada petición se normaliza (minúsculas, sin puerto ni punto final)
y se consulta la configuración pública de la empresa en `GET /api/v1/public/site`.
El contrato canónico vive en
`../plataforma-core-api/docs/contracts/empresa-site-v1.md`.

Estados seguros:

- Dominio no registrado (`404` del backend) → página `404` neutra.
- Fallo de red, `5xx` o respuesta inválida → página `503` neutra. No se reutiliza la configuración de otra empresa.

Los colores se validan como hexadecimales y con contraste mínimo antes de inyectarse como variables CSS (`--empresa-primary`, `--empresa-background`, `--empresa-foreground`). Una combinación insegura se rechaza. Los componentes shadcn/ui estáticos se renderizan en servidor sin hidratación de React.

## shadcn/ui

Los componentes se generan con `npx shadcn@latest add <componente>`. La configuración está en `components.json`; el tema base, en `src/styles/global.css`.

## Administración

Las rutas `/admin`, `/admin/catalogo`, `/admin/inventario`, `/admin/usuarios`,
`/admin/roles`, `/admin/ventas`, `/admin/caja`, `/admin/costos`, `/admin/gastos`,
`/admin/facturacion` y `/admin/clientes` se renderizan dentro del shell de
administración, cuya navegación se genera desde los módulos habilitados de la
empresa y se agrupa por bloques (Operación, Finanzas, Administración). El panel de
inicio resume esos módulos agrupados y ofrece acceso a cada sección, con estados
de carga, vacío y error. La marca del panel y del inicio de sesión (nombre, sector
y logo) proviene de la identidad de la instalación (`src/lib/installation.ts`), de
modo que el frontend nunca muestra la marca de otra empresa. `Facturación` y
`Clientes` muestran el estado de su módulo mientras el backend no publique sus
contratos.

La empresa es implícita de la instalación: no existe un selector de empresa. La
visibilidad de un módulo es presentación, no autorización; el backend autoriza
cada operación.

### Usuarios, roles y permisos

`/admin/usuarios` lista las cuentas de la empresa con su estado y roles, y permite
crear usuarios, activarlos o desactivarlos y asignar o retirar sus roles.
`/admin/roles` permite crear y editar roles y elegir sus permisos por módulo
habilitado; un permiso de un módulo no habilitado no se ofrece ni se concede, y un
rol asignado a usuarios se advierte antes de eliminarlo.

Todas las operaciones se resuelven en el servidor con el patrón BFF
(`src/lib/admin/identity-api.ts` y `src/lib/admin/identity-service.ts`); el
navegador nunca recibe tokens. El contrato es `empresa-identity-admin-v1`
(`docs/contracts/empresa-identity-admin-v1.md`, alineado con el backend hermano).
El módulo de identidad se muestra en el shell como «Usuarios y roles»
(`src/lib/module-catalog.ts`).

Desarrollo sin el backend: `src/lib/admin/identity-fixture.ts` publica un fixture
local con la forma del contrato. Se usa **solo en desarrollo y con activación
explícita** (`IDENTITY_FIXTURE=true`); en cualquier otro caso la aplicación consume
el contrato real y, ante un fallo, muestra un estado neutro sin datos.

Pasos para probar en local:

1. Levanta la API (`mvn spring-boot:run -Dspring-boot.run.profiles=local` en `../plataforma-core-api`).
2. Crea una cuenta activa para la empresa en la base de datos local.
3. Ejecuta `npm run dev` y abre `http://localhost:4321/entrar`.
4. Inicia sesión; serás redirigido a `/admin`.

### Ventas y caja (registro de venta)

El módulo `sales` habilita la operación de caja y ventas:

- `/admin/caja` abre y cierra el **turno de caja** de una sucursal con su resumen
  (ventas, totales por método de pago, efectivo esperado, monto contado y
  diferencia). Sin turno abierto no se pueden registrar ventas.
- `/admin/ventas` es el **registro de venta**: busca productos del catálogo, agrega
  líneas, ajusta cantidades, ve el total recalculado y elige el método de pago.
  Guía a abrir la caja si no hay turno abierto.
- `/admin/ventas/historial` lista las ventas (folio, fecha, total, método de pago
  y estado) con su estado vacío; `/admin/ventas/{id}` muestra el detalle con sus
  líneas, pagos, devoluciones y el acceso al ticket; `/admin/ventas/{id}/ticket`
  es el comprobante imprimible.

El armado de venta es la **única isla React hidratada** (`client:load`); el
historial, el detalle, el comprobante y la caja se renderizan en servidor sin
hidratación. La isla no habla con el backend directamente: llama al endpoint
interno `POST /admin/ventas/registrar`, que lee `Astro.session`, resuelve la
empresa de la instalación y usa el cliente de servidor. El navegador nunca recibe
tokens ni el identificador de la empresa. El registro es idempotente
(`Idempotency-Key`) y un conflicto de stock (`409`) o una validación (`400`) se
muestran sin registrar la venta.

Los cálculos del detalle de venta son funciones puras compartidas
(`src/lib/sales/cart.ts`). El total registrado lo dicta el backend
(`subtotal − discountTotal`); el impuesto se muestra solo como desglose incluido a
partir de `taxRate` del catálogo, sin alterar el total. El contrato es
`empresa-sales-v1` (`docs/contracts/empresa-sales-v1.md`, alineado con el backend
hermano).

Desarrollo sin el backend: `src/lib/sales/fixtures.ts` publica un fixture local
con la forma del contrato (turno, venta, devolución y ticket). Se usa **solo en
desarrollo y con activación explícita** (`SALES_FIXTURE=true`); en cualquier otro
caso la aplicación consume el contrato real y, ante un fallo, muestra un estado
neutro sin datos.

### Costos y gastos

El módulo `costs` habilita el control de costos de la empresa:

- `/admin/costos` lista los productos de la empresa con su precio de venta, el
  **costo de compra** de la sucursal elegida y el **margen** calculado en el
  servidor. Distingue "sin costo registrado" de "margen cero" y muestra el margen
  negativo de forma explícita. Permite registrar o actualizar el costo por
  producto y sucursal con su vigencia.
- `/admin/gastos` registra gastos y costos operativos por **periodo** (mes
  calendario `YYYY-MM`), lista los del periodo consultado y muestra su total; un
  periodo sin gastos presenta un estado vacío con total cero.

Las dos pantallas se renderizan en servidor **sin hidratación de React**: la
información y el margen ya vienen en el HTML. Los formularios siguen el patrón
POST-redirect-GET con validación de servidor (campos obligatorios y montos no
negativos antes de llamar a la API) y mensajes anunciables sin depender del color.
El token y la empresa provienen de `Astro.session`/`Astro.locals`; el navegador
nunca recibe tokens. El contrato esperado es `empresa-costs-v1`
(`docs/contracts/empresa-costs-v1.md`); el canónico lo publicará el backend
hermano. El módulo `costs` se muestra en el shell como «Costos y gastos»
(`src/lib/module-catalog.ts`).

Desarrollo sin el backend: `src/lib/admin/costs-fixture.ts` publica un fixture
local con la forma del contrato (productos con precio, costos por sucursal y
gastos por periodo). Se usa **solo en desarrollo y con activación explícita**
(`COSTS_FIXTURE=true`); en cualquier otro caso la aplicación consume el contrato
real y, ante un fallo, muestra un estado neutro sin datos.

### Reportes

El módulo `reports` habilita `/admin/reportes`, un panel analítico que resume la
operación de la farmacia con KPIs y visuales:

- Ingresos, ventas, ticket promedio, margen de catálogo, gastos del mes, stock
  bajo, productos activos y cobertura de costos.
- Barras de ingresos por mes, mix de cobro por método de pago, top de productos,
  gastos por categoría, margen por producto, inventario bajo y cobertura de
  costos.
- Selector de periodo (`3`, `6` o `12` meses) resuelto por URL, sin hidratación:
  todo el HTML y los SVG se generan en el servidor.

Las lecturas usan las APIs reales del backend hermano: `GET /api/v1/sales`,
`/api/v1/catalog/**`, `/api/v1/inventory/**`, `/api/v1/costs/margins` y
`/api/v1/costs/expenses/totals`. Los cálculos viven en
`src/lib/admin/reports.ts` (funciones puras) y las consultas en
`src/lib/admin/reports-service.ts`; el navegador nunca recibe el token. Si una
fuente falla, el panel muestra el resto y un aviso de carga parcial.

`reports` es un módulo de presentación: no tiene permiso propio. Las pantallas
siguen protegidas por los permisos de ventas, catálogo, inventario y costos que
ya valida el backend.

### Estación de venta

`/admin/ventas` es una estación de caja en dos columnas: catálogo con búsqueda a
la izquierda y detalle de venta fijo a la derecha, con cantidades, subtotal,
descuento, total y método de pago. Al registrar, muestra el número de venta y el
acceso al comprobante. El historial permite filtrar por estado y resume ingresos,
completadas, anuladas y venta promedio.

Las pantallas de costos y gastos usan los endpoints reales del backend
(`GET /api/v1/costs/margins`, `POST /api/v1/costs`, `GET|POST /api/v1/costs/expenses`
y `GET /api/v1/costs/expenses/totals`), no el contrato histórico basado en
periodos.

## Roadmap del ERP

El estado del panel y los próximos bloques (compras, clientes y facturación) están en [docs/erp-roadmap.md](docs/erp-roadmap.md).

Los cambios de inventario y catálogo editable están registrados en OpenSpec: openspec/changes/empresa-inventory-operations y openspec/changes/empresa-catalog-edit. 
