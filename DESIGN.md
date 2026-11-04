# Diseño de interfaz y arquitectura frontend

## Propósito

Un frontend Astro de administración (ERP/CRM) reutilizable, configurable por empresa. La raíz redirige al panel: no hay portada pública. Los paneles se diseñan a partir de flujos reales; los componentes muy interactivos se implementan como islas.

## Dirección visual

Claridad antes que decoración: jerarquía tipográfica marcada, espaciado consistente, superficies sobrias, color funcional y estados visibles. La inspiración de Apple se interpreta como precisión, respuesta inmediata y movimiento discreto, sin copiar su identidad visual.

## Sistema

- shadcn/ui con base Radix y preset Nova es la biblioteca de componentes base. Los componentes viven en `src/components/ui`; se pueden ajustar dentro del repositorio.
- Astro renderiza páginas y contenido público. React se reserva para componentes shadcn/ui e interacciones que lo requieran; los componentes estáticos se renderizan en servidor sin hidratación.
- Tailwind CSS v4 y los tokens de `src/styles/global.css` definen el tema. Los cambios de marca por empresa se aplicarán mediante tokens, no mediante copias de componentes.
- Tokens para color, tipografía, espaciado, radios y estados. El tema de la empresa es una segunda capa de tokens (`--empresa-*`) aplicada por `src/layouts/base-layout.astro` desde la configuración validada; un tema inseguro degrada al tema por defecto (`src/lib/theme.ts`).
- Primitivas de layout y estados en `src/components/primitives/` (contenedor, encabezado de sección, panel, carga, vacío y error), compartidas por sitio público y administración y sin datos de empresa incrustados.
- El shell de administración y su panel de inicio se generan desde los módulos habilitados de la empresa (`src/lib/module-catalog.ts`), agrupados por bloque de navegación (Operación, Finanzas, Administración); activar o desactivar un módulo es configuración, no código.
- Componentes reutilizables sin datos de una empresa incrustados.
- Marca, textos, moneda y módulos visibles provienen de configuración validada. La marca del panel y del inicio de sesión (nombre, sector y logo) vive en la identidad de la instalación (`src/lib/installation.ts`), editable por cliente; la configuración del servidor aporta tema y módulos.
- La raíz (`/`) redirige a `/admin`; no hay portada pública. El 404 y el 503 son páginas neutras del sistema.
- Accesibilidad: HTML semántico, teclado, foco visible, contraste y movimiento reducido.
- Páginas públicas priorizan HTML rápido; interacción compleja se hidrata solo donde aporta valor.

## Integración

- Contratos tipados para la API. La empresa se deriva del servidor (configuración pública de la instalación y sesión autorizada); nunca de un selector manipulable que permita acceso cruzado.
- Sesión con patrón BFF: el navegador nunca recibe tokens. `/entrar` envía las credenciales a un endpoint de servidor que guarda identidad y tokens en `Astro.session`; el navegador solo recibe una cookie `HttpOnly`/`SameSite`. `src/middleware.ts` protege `/admin/**` y adjunta la empresa de la instalación a `Astro.locals`.
- Ningún secreto se expone en variables `PUBLIC_`.
- Administración de identidad (`/admin/usuarios`, `/admin/roles`) resuelta en servidor: los usuarios, roles y permisos de la empresa se gestionan con el cliente de servidor y la sesión, sin exponer tokens. Los permisos seleccionables de un rol se cruzan con los módulos habilitados de la empresa; la autorización real sigue en el backend. El contrato es `empresa-identity-admin-v1` y, sin backend, se desarrolla con un fixture local activado solo en desarrollo.
- Ventas y caja (`/admin/ventas`, `/admin/caja`) resueltas en servidor con el patrón BFF: la isla React del armado de venta es la única hidratada (`client:load`) y llama al endpoint interno `POST /admin/ventas/registrar`, que conserva la sesión y resuelve la empresa. El historial, el detalle, el ticket y la caja no hidratan. Los cálculos del carrito son funciones puras compartidas (`src/lib/sales/cart.ts`) y el total autoritativo es el del backend. El contrato es `empresa-sales-v1` y, sin backend, se desarrolla con un fixture local activado solo en desarrollo (`SALES_FIXTURE=true`).
- Costos y gastos (`/admin/costos`, `/admin/gastos`) resueltos en servidor sin hidratación: el costo de compra por producto y sucursal y el margen frente al precio de venta se calculan en la página SSR, y los gastos operativos se listan y totalizan por periodo. La empresa y el token provienen de la sesión, nunca del navegador. El contrato esperado es `empresa-costs-v1` y, sin backend, se desarrolla con un fixture local activado solo en desarrollo (`COSTS_FIXTURE=true`).
