# Diseño de interfaz y arquitectura frontend

## Propósito

Un frontend Astro de administración (ERP/CRM) reutilizable, configurable por empresa. La raíz redirige al panel: no hay portada pública. Los paneles se diseñan a partir de flujos reales; los componentes muy interactivos se implementan como islas.

## Dirección visual

Minimalismo operativo: una sola familia tipográfica (Inter Variable), papel frío
y superficies blancas con hairlines, jerarquía por peso y espacio, y el color de
marca concentrado en el sidebar y las acciones. La inspiración de dashboards
analíticos se interpreta como densidad escaneable: KPIs compactos, visuales SVG
en servidor y cero decoración que no comunique estado. No se copia la identidad
visual de Apple ni de ninguna herramienta de BI.

## Sistema

- shadcn/ui con base Radix y preset Nova es la biblioteca de componentes base. Los componentes viven en `src/components/ui`; se pueden ajustar dentro del repositorio.
- Astro renderiza páginas y contenido público. React se reserva para componentes shadcn/ui e interacciones que lo requieran; los componentes estáticos se renderizan en servidor sin hidratación.
- Tailwind CSS v4 y los tokens de `src/styles/global.css` definen el tema. Los cambios de marca por empresa se aplicarán mediante tokens, no mediante copias de componentes.
- Tokens para color, tipografía, espaciado, radios y estados. El tema de la empresa es una segunda capa de tokens (`--empresa-*`) aplicada por `src/layouts/base-layout.astro` desde la configuración validada; un tema inseguro degrada al tema por defecto (`src/lib/theme.ts`).
- El shell de administración usa el color principal de la empresa en el sidebar, agrupa la navegación en secciones colapsables (`<details>`) y ofrece un modo riel de solo iconos. El estado se recuerda en `localStorage` con un script mínimo; no hay islas de framework para la navegación.
- El panel de inicio se genera desde los módulos habilitados (`src/lib/module-catalog.ts`), agrupados por bloque (Operación, Analítica, Finanzas, Administración); activar o desactivar un módulo es configuración, no código.
- El módulo `reports` (`/admin/reportes`) es un panel de analítica de solo lectura: KPIs, serie mensual comparada, mix de cobro, top de productos, categorías, gastos, margen por producto y stock bajo. Las páginas renderizan el contenido y los datos en servidor; los gráficos usan Chart.js como isla mínima montada sobre canvas declarativos en `src/components/reports/`, con tabla de datos accesible como respaldo y leyendas que filtran series. Los cálculos puros viven en `src/lib/admin/reports.ts` y la configuración de los gráficos en `src/lib/admin/chart-*.ts`. El panel de inicio reutiliza la misma isla para el pulso mensual, con selector interactivo entre ingresos y ventas.
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
- Ventas y caja (`/admin/ventas`, `/admin/caja`) resueltas en servidor con el patrón BFF: la isla React del armado de venta es la única hidratada (`client:load`) y llama al endpoint interno `POST /admin/ventas/registrar`, que conserva la sesión y resuelve la empresa. El historial, el detalle, el comprobante y la caja no hidratan. Los cálculos del detalle de venta son funciones puras compartidas (`src/lib/sales/cart.ts`) y el total autoritativo es el del backend. El contrato es `empresa-sales-v1` y, sin backend, se desarrolla con un fixture local activado solo en desarrollo (`SALES_FIXTURE=true`).
- Facturación (`/admin/facturacion`) resuelta en servidor: la venta con NIT crea un documento fiscal y la venta sin NIT queda como comprobante interno. El panel muestra KPIs, pestañas por estado (pendiente, enviando, procesada, observada, rechazada, con error y anulada), búsqueda por NIT o CUF, fechas, paginación, detalle con bitácora y factura imprimible. Las acciones de envío y anulación son formularios SSR; el POS solo hidrata el interruptor de factura y los datos del comprador. El contrato es `empresa-billing-v1`.
- Costos y gastos (`/admin/costos`, `/admin/gastos`) resueltos en servidor sin hidratación: el costo de compra por producto y sucursal y el margen frente al precio de venta se calculan en la página SSR, y los gastos operativos se listan y totalizan por periodo. La empresa y el token provienen de la sesión, nunca del navegador. El contrato esperado es `empresa-costs-v1` y, sin backend, se desarrolla con un fixture local activado solo en desarrollo (`COSTS_FIXTURE=true`).
