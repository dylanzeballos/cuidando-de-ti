# Acceso por rol en el panel

## Why

Hoy la navegación del panel se arma solo con los módulos habilitados de la
empresa: una cuenta con un rol de solo ventas ve las mismas opciones que un
administrador y descubre sus límites al abrir una sección, cuando el backend
responde que no tiene autorización. Además, el selector de sucursal de costos
enlaza al inventario, de modo que cambiar de sucursal saca al usuario de la
pantalla en la que estaba trabajando.

## What Changes

- El shell oculta los módulos para los que la cuenta no tiene permiso efectivo.
- Las rutas de `/admin/**` se bloquean por URL cuando falta el permiso de la
  sección; el usuario recibe una página 403 en lugar de un error de API.
- El panel de inicio adapta sus tarjetas, gráficos y accesos rápidos a los
  permisos de la cuenta.
- El selector de sucursal de costos conserva la sección y los filtros.
- El middleware carga el perfil propio (`GET /api/v1/identity/me`) y lo expone
  como `Astro.locals.access`; si el perfil no está disponible, falla cerrado y
  no muestra opciones sin verificar.

### Exclusiones

- Nuevas reglas de negocio o cambios en la autorización del backend.
- Permisos por acción dentro de un módulo: el permiso `.manage` del módulo
  habilita la sección completa.

## Capabilities

### New Capabilities

- `panel-role-access`: navegación, inicio y rutas del panel adaptados a los
  permisos efectivos de la cuenta.

### Modified Capabilities

<!-- Ninguna. -->

## Impact

- `src/lib/auth/profile-api.ts` y `profile-service.ts` (nuevos).
- `src/lib/admin/access.ts` (nuevo): módulos, rutas y primer destino permitido.
- `src/middleware.ts`, `src/env.d.ts`, `src/components/admin/admin-shell.astro`.
- `src/components/dashboard/*` y `src/pages/admin/index.astro`.
- `src/components/admin/branch-picker.astro`, `costs-branch-card.astro`,
  `inventory-branch-card.astro` y `src/pages/admin/costos.astro`.
- `src/pages/sin-acceso.astro` (nuevo).
- El backend hermano expone `GET /api/v1/identity/me`.

### Reversión

Restaurar el shell y el middleware anteriores y retirar las reglas de acceso y
la página 403. El backend puede conservar `/identity/me`: es una lectura de solo
perfil y no cambia datos.
