## Context

El panel es SSR con patrón BFF. `src/middleware.ts` protege `/admin/**`, renueva
la sesión y adjunta la empresa y sus módulos a `Astro.locals`. La navegación se
arma en `admin-shell.astro` con `buildModuleViews(modules)`. El backend ya
autoriza cada operación con permisos efectivos, pero el frontend no conocía los
permisos de la cuenta. El backend hermano publica `GET /api/v1/identity/me` con
la cuenta, sus roles y sus permisos efectivos.

## Goals / Non-Goals

**Goals:**

- Ocultar módulos, accesos rápidos y tarjetas para los que falta permiso.
- Bloquear por URL las secciones de `/admin/**` sin permiso.
- Mantener el backend como autoridad y no confiar en datos del navegador.
- Conservar la sección y los filtros al cambiar de sucursal en costos.

**Non-Goals:**

- Permisos por acción o por botón dentro de un módulo.
- Cambiar los permisos o la autorización del backend.
- Cachear el perfil entre peticiones.

## Decisions

### Perfil en el middleware

Cada petición a `/admin/**` carga la empresa y el perfil en paralelo con el token
de la sesión. El perfil se escribe en `Astro.locals.access` como roles y
permisos. Si el backend responde 401, se destruye la sesión y se redirige a
`/entrar?error=session`. Si el perfil no está disponible, se falla cerrado: se
redirige a `/sin-acceso?motivo=perfil` (503) porque sin permisos no se puede
decidir qué mostrar. El backend sigue siendo la autoridad de cada operación.

### Reglas puras de presentación

`src/lib/admin/access.ts` centraliza el mapa módulo → permisos, los prefijos de
ruta protegidos y el primer destino permitido. El shell, el middleware y el
inicio consumen las mismas funciones, de modo que la navegación y el bloqueo por
URL no se contradicen. `reports` se reserva a `costs.manage` porque es una vista
financiera: una cuenta de solo ventas no debe verla.

### Página 403

Una ruta sin permiso responde con una redirección a `/sin-acceso`, que se sirve
con estado 403 y ofrece volver al panel. No se muestra el contenido protegido ni
se llama a la API de la sección.

### Selector de sucursal

`branch-picker.astro` recibe `basePath` y los filtros a conservar. Inventario
sigue apuntando a `/admin/inventario`; costos apunta a `/admin/costos` con `q` y
`estado`. Así cambia la sucursal sin abandonar la pantalla.

### Inicio adaptado

Las tarjetas de métricas, los paneles de gráficos y la galería reciben los
permisos y solo renderizan lo que la cuenta puede consultar. Los enlaces rápidos
a inventario y catálogo desaparecen cuando no hay permiso.

## Risks / Trade-offs

- [Petición extra por página] → Se ejecuta en paralelo con la carga del sitio y
  usa el token ya renovado por el middleware.
- [Perfil no disponible] → Se degrada a la navegación por módulos; el backend
  sigue rechazando operaciones sin permiso.
- [Cambio de permisos en caliente] → El perfil se consulta en cada petición, así
  que un cambio de rol se refleja en la siguiente navegación.
