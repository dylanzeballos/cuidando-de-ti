## Context

`plataforma-web` renderiza en servidor con `output: server` y el adaptador de Node. El cambio `empresa-app-foundation` aporta el sistema de diseño, el shell de administración por módulos habilitados, la sesión de servidor con patrón BFF y el middleware que protege `/admin/**` y adjunta la empresa de la instalación a `Astro.locals`. La empresa es la de la instalación: una sola empresa por base de datos y servidores, sin tenant ni selector de empresa. El backend `../plataforma-core-api` (cambio `empresa-catalog-inventory`) expone `/api/v1/catalog` y `/api/v1/inventory` protegidos por la sesión autenticada, sin cabecera `X-Tenant-Slug`. Ver `proposal.md` para la motivación y `specs/catalog-admin` para el comportamiento exigido.

## Goals / Non-Goals

**Goals:**

- Operar catálogo e inventario desde la web sin exponer credenciales al navegador.
- Aprovechar el SSR existente y formularios HTML nativos (mejora progresiva) sin hidratar React.
- Reutilizar el shell, la sesión de servidor y las primitivas de `empresa-app-foundation`, así como tokens, componentes y estilos ya existentes.

**Non-Goals:**

- POS/ventas, facturación, traspasos y edición avanzada.
- Sesión y deducción de la empresa, que aporta `empresa-app-foundation`.
- Persistencia propia en el frontend.

## Decisions

### Patrón BFF con sesión de servidor

Las rutas `get` de administración se renderizan dentro del shell y detrás de la sesión de servidor que aporta `empresa-app-foundation`, y leen los datos llamando a la API desde el servidor Astro con la identidad y la empresa de la sesión (`Astro.locals`), sin tokens fijos ni variables `PUBLIC_`. La empresa proviene del servidor, nunca de `query`, `body` ni `localStorage`. El navegador solo recibe HTML; ninguna credencial se serializa al cliente. Alternativa descartada: llamar a la API desde el navegador, que exigiría exponer credenciales o duplicar la sesión.

### Formularios sin hidratación

Los formularios usan `method="post"` hacia un endpoint Astro (`POST /admin/catalogo`, `POST /admin/inventario/movimientos`). El endpoint lee `request.formData()`, valida en servidor, llama a la API y responde con `redirect` a la misma página añadiendo un parámetro de resultado (`?ok=...` o `?error=...`). Así no hace falta isla React y se cumple el requisito de no hidratar contenido estático. Alternativa descartada: formularios React con `client:load`, que añadirían hidratación innecesaria.

### Cliente de API tipado (servidor)

`src/lib/admin/catalog-api.ts` define DTOs alineados con el contrato del backend y una función por operación (listar/crear categoría y producto, listar sucursales y stock, registrar movimiento). Recibe la identidad y la empresa desde la sesión de servidor y mapea errores del backend a un resultado discriminado (`ok` / `validation` / `conflict` / `unauthorized` / `unavailable`) para que la página elija el mensaje.

### Ubicación dentro del shell, empresa de la instalación

Las páginas de administración se renderizan dentro del shell y detrás de la sesión; la empresa es la de la instalación y se deduce del servidor (sesión y middleware), nunca del dominio público ni de un selector. Se mantiene separada de la lógica de presentación pública de `empresa-web` para no mezclar marca pública con operación.

### Accesibilidad

Controles HTML nativos con `label` asociado, `fieldset`/`legend` cuando aplique, mensajes de error anunciables (`role="alert"`) y foco visible provisto por los tokens existentes. Reutiliza `Button`, `Card` y campos de `src/components/ui`.

## Risks / Trade-offs

- [Las rutas de administración requieren sesión] → Deben estar protegidas por el middleware de `empresa-app-foundation`; sin sesión se redirige a `/entrar` y no se enlazan desde el sitio público.
- [Cada envío de formulario recarga la página] → Aceptable para administración; evita complejidad de estado en cliente.
- [Una empresa por instalación] → El código no debe asumir un selector de empresa; la empresa proviene de la sesión de servidor y no de un valor enviado por el cliente.
- [Desalineación con el contrato del backend] → El cliente tipado se construye contra `docs/contracts/empresa-catalog-inventory-v1.md` y las pruebas verifican las formas esperadas.

## Migration Plan

1. Se publican las rutas `admin` dentro del shell y detrás de la sesión, con su cliente.
2. Reversión: eliminar `src/pages/admin/**` y `src/lib/admin/**`; el sitio público y el shell no cambian.
