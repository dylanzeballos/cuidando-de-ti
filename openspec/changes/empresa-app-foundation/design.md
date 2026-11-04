## Context

`plataforma-web` renderiza en servidor con `output: server` y el adaptador de Node, resuelve la empresa por el hostname y ya tiene una portada pública y dos pantallas de administración que llaman a la API con un token fijo de desarrollo. El sistema es una aplicación de una sola empresa por instalación: cada cliente (por ejemplo la farmacia "Cuidando de Ti") tiene su propia base de datos y sus servidores, y activa o desactiva módulos según lo contratado.

Ver `proposal.md` para la motivación. Los requisitos están en `specs/design-system`, `specs/admin-shell`, `specs/dashboard` y `specs/session-auth`.

## Goals / Non-Goals

**Goals:**

- Una sola base visual (tokens + primitivas) compartida por sitio público y administración, con tema por empresa.
- Un shell de administración y un panel de inicio que crezcan por módulos habilitados, sin reescribir navegación.
- Inicio y cierre de sesión con patrón BFF y sesión de servidor; el navegador nunca recibe tokens.
- Empresa implícita de la instalación, nunca elegida por el cliente.

**Non-Goals:**

- Módulos de negocio (catálogo/inventario, ventas, usuarios/roles, costos) y facturación/contable.
- Autenticación federada, recuperación de contraseña o registro de usuarios nuevos.
- Aprovisionamiento, instalación y actualizaciones por cliente (operativo).

## Decisions

### Sistema de diseño en dos capas de tokens

Los tokens globales viven en `src/styles/global.css` y las primitivas en `src/components/`. El tema de la empresa se aplica como una segunda capa que sobrescribe variables (las variables de tema que la portada ya usa, renombradas al modelo `empresa`) en un layout raíz, de modo que los componentes solo consuman tokens. Alternativa descartada: generar CSS o componentes por empresa, que multiplicaría el mantenimiento y rompería la regla de no incrustar marca en componentes compartidos.

### Shell y panel parametrizados por módulos habilitados

El shell recibe la lista de módulos habilitados de la empresa y genera la navegación cruzando esos códigos con un registro de presentación (código → etiqueta, icono y ruta; extendiendo `src/lib/module-catalog.ts`). El panel de inicio reutiliza la misma fuente para mostrar accesos y estados. Habilitar o deshabilitar un módulo es configuración del backend, no un cambio en el shell. Alternativa descartada: enlaces fijos, que exigirían editar el shell por cada empresa.

### Autenticación BFF con sesión de servidor de Astro

El formulario de `/entrar` hace `POST` a un endpoint Astro. El endpoint valida en servidor, llama a la API de autenticación y guarda la identidad y los tokens en `Astro.session`. Astro entrega solo una cookie de sesión con `HttpOnly` y `SameSite=Lax` (y `Secure` en producción); se configura en `astro.config.mjs` (`session.cookie`). Con el adaptador de Node el almacenamiento de sesión es el sistema de archivos local, configurable a otro driver (por ejemplo Redis) sin tocar la aplicación. Alternativas descartadas: guardar el JWT en `localStorage` con `Authorization: Bearer` (expuesto a XSS y prohibido por las guías del proyecto) y una cookie con JWT sin estado (no permite revocar la sesión ni cerrar sesión de forma efectiva).

### Protección de rutas y empresa de la instalación

Un `src/middleware.ts` de Astro protege `/admin/**`: sin sesión redirige a `/entrar`; con sesión, adjunta la empresa de la instalación (identificador de la cuenta autenticada y su empresa) a `Astro.locals` para que las páginas y sus llamadas a la API la usen. La empresa nunca se toma de `query`, `body` ni `localStorage`, y no existe un selector de empresa porque cada instalación sirve a una sola. Alternativa descartada: comprobar la sesión dentro de cada página, que duplicaría la lógica y es fácil de olvidar.

### Cliente de API por sesión

Las pantallas de catálogo e inventario dejan de leer un token de administración fijo y pasan a usar la identidad y la empresa de la sesión a través del cliente tipado. El contrato de autenticación/sesión define `login`, `refresh` y `logout`; mientras no exista, el frontend se desarrolla contra un fixture local que replica esa forma.

### SSR, caché y estados

Las rutas de sesión y administración se renderizan siempre en servidor, sin caché (`Cache-Control: no-store`) y con `noindex`. La portada pública conserva su resolución por dominio y su política de caché actual. Los estados de interfaz (carga, vacío, error) se resuelven con las primitivas del sistema; el login distingue credenciales rechazadas (4xx) de una indisponibilidad temporal (timeout o 5xx) y no crea sesión en este último caso.

## Risks / Trade-offs

- [El backend aún no emite tokens] → Se define el contrato de autenticación y se implementa contra un fixture; la tarea de backend corre en paralelo.
- [Sesión en el sistema de archivos del adaptador Node no sirve para varias instancias] → Documentar el driver externo (Redis) como opción de despliegue; no cambia el código de la aplicación.
- [Migrar catálogo e inventario a sesión rompe el flujo de desarrollo por token fijo] → Se actualizan las guías y `.env.example` en la misma tarea; el rollback restaura el token de desarrollo.
- [Módulos habilitados son presentación, no autorización] → El shell y el panel ocultan accesos, pero el backend autoriza cada operación; se documenta para no confundir visibilidad con permiso.
- [Una empresa por instalación] → El código no debe asumir varias empresas ni un selector de empresa; se evita cualquier resolución de empresa desde el cliente.

## Migration Plan

1. Introducir tokens y primitivas y migrar la portada sin cambiar el comportamiento público.
2. Añadir shell y panel modulares.
3. Añadir sesión, `/entrar`, logout y el middleware de protección, primero contra el fixture del contrato.
4. Mover catálogo e inventario detrás de la sesión y retirar el token de administración fijo.
5. Reversión: eliminar rutas de sesión y middleware, restaurar `index.astro` y el shell previos; el sitio público no se ve afectado.
