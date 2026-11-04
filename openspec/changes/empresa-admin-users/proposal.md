# Administración de usuarios y roles

## Why

La fundación de la aplicación (`empresa-app-foundation`) aporta el sistema de diseño, el shell, la sesión de servidor y el panel, pero todavía no hay forma de operar quién puede entrar ni qué puede hacer cada persona. Una empresa como la farmacia "Cuidando de Ti" necesita dar de alta a sus usuarios, activarlos o desactivarlos y definir roles con permisos por módulo para delegar la operación sin compartir una cuenta única. Sin esta capacidad, cada instalación depende de un usuario administrador fijo y no puede crecer por módulos con accesos diferenciados.

## What Changes

- Añadir la interfaz de administración de **usuarios de la empresa**: listar, crear, activar/desactivar y asignar o retirar roles, dentro del shell y la sesión que aporta `empresa-app-foundation`.
- Añadir la **gestión de roles y permisos configurables por módulo**: crear y editar roles y seleccionar sus permisos, donde cada permiso pertenece a un módulo habilitado de la empresa.
- Resolver toda la operación en servidor con el patrón BFF: el navegador solo recibe HTML y nunca tokens, credenciales ni la URL interna de la API.
- Cubrir estados de carga, vacío y error, y accesibilidad (HTML semántico, foco visible, movimiento reducido) reutilizando el sistema de diseño.
- Mantener el modelo de **una sola empresa por instalación**: no existe tenant ni selector de empresa; la empresa es la de la instalación y proviene de la sesión de servidor.

### Exclusiones

- Facturación y sistema contable (cambios posteriores).
- Autenticación federada (OAuth/SSO), recuperación de contraseña y registro público.
- Módulos de negocio (catálogo/inventario, ventas/POS, costos); esta capacidad solo administra identidad y permisos de esos módulos.
- Aprovisionamiento, instalación y actualizaciones por cliente (operativo).

### Dependencies

- `docs/contracts/empresa-auth-session-v1.md` (login, refresh y logout), que ya define la sesión usada por la administración.
- Contrato de administración de identidad del backend (usuarios, roles y permisos) que publicará el cambio `empresa-authentication` del repo hermano `../plataforma-core-api`. Mientras no exista, el frontend se desarrolla contra un fixture local con la forma acordada.
- Requiere las capacidades `design-system`, `admin-shell`, `dashboard` y `session-auth` de `empresa-app-foundation` (shell, sesión de servidor y primitivas de estado).

### Rollback

- Reversión: eliminar las rutas `/admin/usuarios` y `/admin/roles` y su cliente de servidor, y retirar el enlace del módulo en `src/lib/module-catalog.ts`; el resto del shell, la sesión y las capacidades existentes siguen funcionando sin cambios. No se persiste información de rol en el navegador.

## Capabilities

### New Capabilities

- `admin-users`: administración web de usuarios de la empresa (listar, crear, activar/desactivar y asignar roles) y de roles con permisos configurables por módulo habilitado, con patrón BFF y accesibilidad.

### Modified Capabilities

<!-- Ninguna: no cambia el comportamiento de `design-system`, `admin-shell`, `dashboard` ni `session-auth`; se reutilizan sin modificar sus requisitos. -->

## Impact

- Nuevas páginas en `src/pages/admin/usuarios.astro` y `src/pages/admin/roles.astro`, componentes de formulario y tablas de administración, y un cliente de API de servidor en `src/lib/admin/identity-api.ts` (o nombre equivalente) alineado con el contrato de identidad.
- Reutiliza el shell, la sesión de servidor, el cliente autenticado y las primitivas de estado de `empresa-app-foundation` y los componentes de `src/components/ui` (shadcn/ui).
- Extiende `src/lib/module-catalog.ts` con la entrada de presentación del módulo de usuarios; no incrusta datos de la empresa en componentes compartidos.
- Ninguna variable `PUBLIC_` nueva con secretos: la lista de permisos y los datos de identidad se resuelven desde la sesión de servidor y la API.
- Depende del contrato `docs/contracts/empresa-auth-session-v1.md` y del contrato de administración de identidad del backend (`empresa-authentication` en `../plataforma-core-api`); hasta su publicación, el desarrollo usa un fixture local.
