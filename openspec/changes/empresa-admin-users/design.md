## Context

`plataforma-web` renderiza en servidor con `output: server` y el adaptador de Node. El cambio `empresa-app-foundation` aporta el sistema de diseño, el shell de administración por módulos habilitados, la sesión de servidor con patrón BFF y el middleware que protege `/admin/**` y adjunta la empresa de la instalación a `Astro.locals`. La empresa es la de la instalación: una sola empresa por base de datos y servidores, sin tenant ni selector de empresa.

Faltan la administración de usuarios y de roles de esa empresa. El backend `../plataforma-core-api` (cambio `empresa-authentication`) publicará un contrato de administración de identidad (usuarios, roles y permisos); mientras no exista, el desarrollo usa un fixture local con la forma acordada. Ver `proposal.md` para la motivación y `specs/admin-users` para el comportamiento exigido.

## Goals / Non-Goals

**Goals:**

- Administrar usuarios de la empresa (listar, crear, activar/desactivar y asignar/retirar roles) desde la administración.
- Definir roles con permisos que pertenecen a módulos habilitados de la empresa.
- Resolver todas las operaciones desde el servidor (BFF): el navegador nunca recibe tokens ni la URL interna de la API.
- Reutilizar el sistema de diseño, las primitivas de estado y la accesibilidad ya existentes.

**Non-Goals:**

- Autenticación federada, recuperación de contraseña y registro público.
- Módulos de negocio y facturación/contable.
- Eliminar o migrar usuarios y roles existentes en otras instalaciones (operativo).

## Decisions

### Pantallas SSR dentro del shell, sin hidratación innecesaria

Las páginas `/admin/usuarios` y `/admin/roles` se renderizan en servidor dentro del shell compartido, leyendo los datos con el cliente autenticado de la sesión. Los formularios de alta, cambio de estado y asignación usan `method="post"` hacia endpoints Astro que validan en servidor, llaman a la API y responden con `redirect` a la misma página con un parámetro de resultado (`?ok=...` o `?error=...`). Se evita hidratar React: los controles son componentes de `src/components/ui` (shadcn/ui) renderizados sin `client:*`, salvo un control interactivo estrictamente necesario (por ejemplo, un selector de permisos), que se hidrata solo si aporta valor. Alternativa descartada: SPA con hidratación completa, que contradice la preferencia del proyecto por HTML servido y complica la accesibilidad.

### Cliente de identidad tipado en servidor

`src/lib/admin/identity-api.ts` define DTOs alineados con el contrato de administración de identidad (usuario, rol, permiso, módulo) y una función por operación (listar/crear/estado usuario, listar/crear/editar/eliminar rol, asignar/retirar rol). Expone la empresa e identidad desde la sesión (`Astro.locals`), nunca desde `query`, `body` ni `localStorage`. Mapea respuestas a un resultado discriminado (`ok` / `validation` / `conflict` / `unauthorized` / `unavailable`) para que las páginas elijan el mensaje. Alternativa descartada: llamar a la API desde el navegador, que exigiría exponer credenciales.

### Permisos derivados de módulos habilitados

La lista de permisos seleccionables se construye cruzando los permisos que devuelve la API de identidad con los módulos habilitados de la empresa que el shell ya resuelve (`src/lib/module-catalog.ts` y la configuración de la empresa). Un permiso cuyo módulo no está habilitado no se ofrece ni se concede. La autorización real vive en el backend; ocultar o mostrar permisos es presentación, no seguridad.

### Datos de presentación del módulo de usuarios

Se extiende `src/lib/module-catalog.ts` con el mapeo del módulo de usuarios (código → etiqueta, icono y ruta) para que el shell y el panel lo muestren cuando la empresa lo tenga habilitado, sin incrustar datos de la empresa en componentes compartidos.

### Empresa de la instalación

La empresa proviene de la sesión de servidor y del middleware existente; no hay selector de empresa ni identificador enviado por el cliente. Las operaciones se ejecutan contra la empresa de la instalación.

### SSR, caché y estados

Las rutas de administración se renderizan siempre en servidor, sin caché (`Cache-Control: no-store`) y con `noindex`, coherente con el resto de la administración. Los estados de carga, vacío y error usan las primitivas del sistema de diseño; ante un fallo de la API se muestra un mensaje temporal neutro y no se renderizan datos de identidad.

### Accesibilidad

Tablas semánticas con encabezados, formularios con `label` asociado, mensajes de error anunciables (`role="alert"`), foco visible provisto por los tokens y respeto por `prefers-reduced-motion`. Se reutilizan `Button`, `Card`, campos y patrones de `src/components/ui`.

## Risks / Trade-offs

- [El backend aún no publica el contrato de administración de identidad] → Se define el cliente contra la forma acordada y se implementa con un fixture local; la tarea de backend corre en paralelo y el cliente se alinea al publicarse.
- [Los permisos son presentación y no autorización] → El backend autoriza cada operación; se documenta para no confundir visibilidad con permiso.
- [Permisos de módulos deshabilitados asignados previamente] → No se ofrecen al editar y no se conceden; el backend los ignora.
- [Formularios que recargan la página] → Aceptable para administración y coherente con el resto del panel; evita estado complejo en cliente.
- [Una empresa por instalación] → El código no asume varias empresas ni un selector; se evita cualquier resolución de empresa desde el cliente.

## Migration Plan

1. Añadir el cliente de identidad y su fixture contra la forma acordada, con pruebas del mapeo de resultados.
2. Publicar `/admin/usuarios` y `/admin/roles` dentro del shell y su entrada en `module-catalog`.
3. Endpoints de `POST` para alta, estado y asignación de roles, y para crear/editar/eliminar roles.
4. Aplicar `no-store` y `noindex` y actualizar la documentación.
5. Reversión: eliminar las rutas `/admin/usuarios` y `/admin/roles` y su cliente, y retirar la entrada de `module-catalog`; el shell, la sesión y las demás capacidades siguen funcionando.
