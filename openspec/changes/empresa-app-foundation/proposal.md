# Fundación de la aplicación de empresa: diseño, sesión, shell y panel

## Why

Cada empresa tendrá su propio sistema de información instalado con su base de datos: una farmacia como "Cuidando de Ti", un taller mecánico, una ferretería o una tienda. Para venderlo y configurarlo por cliente sin duplicar trabajo, necesitamos una base modular y reutilizable: un sistema de diseño común, un shell de administración que crezca por módulos habilitados y un inicio de sesión real. Hoy la administración no tiene sesión y cada pantalla repite marca, tipografía y layout.

## What Changes

- Introducir un **sistema de diseño global** con tokens (color, tipografía, espaciado, radios y estados), tema por empresa y primitivas de layout/estados compartidas por el sitio público y la administración; la marca se aplica por tokens, nunca copiando componentes.
- Construir un **shell de administración modular** (encabezado, navegación lateral y contenido) cuyo menú se genera desde los módulos habilitados de la empresa, de modo que activar o desactivar funcionalidades sea configuración y no código nuevo.
- Añadir un **panel de inicio** con los módulos activos, accesos rápidos y estados de carga, vacío y error.
- Añadir **inicio y cierre de sesión** con patrón BFF: Astro conserva la sesión en el servidor y el navegador nunca recibe tokens.
- Proteger las rutas de administración; la empresa es la de la instalación, no un valor elegido por el cliente.
- Migrar la portada pública y las pantallas existentes a las primitivas y al shell, y retirar el token de administración fijo.

## Capabilities

### New Capabilities

- `design-system`: tokens visuales globales, tema por empresa y primitivas de layout/estados reutilizables con accesibilidad.
- `admin-shell`: shell de administración navegable por módulos habilitados de la empresa, con estados de carga, vacío y error.
- `dashboard`: panel de inicio que resume los módulos habilitados y da acceso a sus secciones.
- `session-auth`: inicio y cierre de sesión, sesión de servidor con cookie segura y protección de rutas de administración.

### Modified Capabilities

<!-- Ninguna: `openspec/specs/` está vacío (no hay capacidades archivadas). La portada y las pantallas de catálogo/inventario existentes se reescriben con las primitivas nuevas sin cambiar sus requisitos de negocio. -->

## Impact

- Nuevas páginas de sesión (`/entrar` y cierre de sesión), panel de inicio y rutas de administración protegidas; cliente de servidor de autenticación en `src/lib/auth/`.
- Nuevos tokens y primitivas en `src/styles/global.css` y `src/components/`; refactor de `src/pages/index.astro`, de `src/components/admin/admin-shell.astro` y de las páginas de administración existentes.
- Nuevas variables de servidor para la sesión (clave de sesión y cookie), ninguna con prefijo `PUBLIC_`.
- Reutiliza el SSR por dominio, shadcn/ui (`src/components/ui`) y los patrones de formulario sin hidratación.
- Depende de un contrato de autenticación del backend hermano (login, refresh, logout) y del contrato de configuración de la empresa (nombre, tema y módulos habilitados).

### Modelo de despliegue

- Una instalación y una base de datos dedicada por empresa, alojada en servidores del cliente; una sola empresa por instalación.
- No hay multiempresa ni selección de empresa: la empresa es implícita de la instalación y su configuración (nombre, tema, módulos habilitados y usuarios) vive en su propia base.
- El código es modular y reutilizable: activar o desactivar módulos es configuración de cada empresa, no código nuevo.
- El aprovisionamiento, la instalación y las actualizaciones por cliente son operativos y quedan fuera de este cambio.

### Exclusiones

- Módulos de negocio: catálogo e inventario, ventas/POS, usuarios y roles, y costos (cambios separados).
- Facturación y sistema contable, que consumirán APIs propias más adelante.
- Autenticación federada (OAuth/SSO), recuperación de contraseña y registro público.

### Dependencies

- Backend hermano: contrato `docs/contracts/empresa-auth-session-v1.md` (login, refresh y logout) que publicará el cambio de autenticación `empresa-authentication`. Mientras no exista, el frontend se desarrolla contra un fixture local.
- Contrato `docs/contracts/empresa-site-v1.md` con la configuración de la empresa (nombre, tema y módulos habilitados), publicado por `empresa-core`.

### Rollback

- Reversión: eliminar las rutas de sesión y su cliente y restaurar `index.astro` y el shell previos; las pantallas existentes siguen funcionando con su token de desarrollo. No se almacena configuración de empresa en el navegador como autoridad.
