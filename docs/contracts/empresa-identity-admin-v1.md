# Contrato de administración de identidad de la empresa (v1) — vista del frontend

El contrato canónico vive en el backend hermano:
`../plataforma-core-api/docs/contracts/empresa-identity-admin-v1.md`. Este documento
resume el contrato publicado y describe cómo lo consume `plataforma-web` con el
patrón BFF; no lo redefine ni lo duplica.

Una instalación sirve a **una sola empresa**: la empresa es implícita y no se
selecciona por petición. Estas rutas no aceptan ni requieren identificador ni
encabezado de selección de empresa; cualquier valor enviado (`X-Tenant-Slug`, un
campo `empresaId`, etc.) se ignora.

## Autorización

Todas las rutas exigen `Authorization: Bearer <accessToken>` de una cuenta activa
con el permiso efectivo `identity.manage` y el módulo `identity` habilitado en la
empresa. La excepción es `GET /api/v1/identity/me`, que solo exige un token válido
para que cualquier cuenta lea sus propios roles y permisos. La decisión se toma en
el servidor; el cliente nunca declara sus permisos. Sin token válido → `401`; sin
permiso o módulo → `403`.

## Endpoints

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/identity/users` | — (`status`, `q`, `page`, `size`) | `200` `PageResponse<UserAccountResponse>` |
| `GET` | `/api/v1/admin/identity/users/{userId}` | — | `200` `UserAccountResponse` |
| `POST` | `/api/v1/admin/identity/users` | `{ email, password, displayName, active? }` | `201` `UserAccountResponse` |
| `PUT` | `/api/v1/admin/identity/users/{userId}` | `{ email, displayName }` | `200` `UserAccountResponse` |
| `POST` | `/api/v1/admin/identity/users/{userId}/status` | `{ active }` | `200` `UserAccountResponse` |
| `PUT` | `/api/v1/admin/identity/users/{userId}/roles` | `{ roles: [<uuid>] }` | `200` `UserAccountResponse` |
| `GET` | `/api/v1/admin/identity/roles` | — | `200` `RoleResponse[]` |
| `GET` | `/api/v1/admin/identity/roles/{roleId}` | — | `200` `RoleResponse` |
| `POST` | `/api/v1/admin/identity/roles` | `{ name, description?, permissions: [<code>] }` | `201` `RoleResponse` |
| `PUT` | `/api/v1/admin/identity/roles/{roleId}` | `{ name, description?, permissions }` | `200` `RoleResponse` |
| `DELETE` | `/api/v1/admin/identity/roles/{roleId}` | — | `204` sin cuerpo |
| `GET` | `/api/v1/admin/identity/permissions` | — | `200` `PermissionGroupResponse[]` |
| `GET` | `/api/v1/identity/me` | — | `200` `ProfileResponse` |

`ProfileResponse` (perfil propio, sin requerir `identity.manage`):

```json
{
  "id": "<uuid>",
  "email": "ana@acme.test",
  "displayName": "Ana",
  "roles": ["Vendedor"],
  "permissions": ["sales.manage"]
}
```

`permissions` solo incluye permisos efectivos: roles asignados a la cuenta activa
y módulos habilitados en la empresa. El frontend lo usa para filtrar la
navegación y bloquear por URL; el backend sigue autorizando cada operación.

Formas comunes:

```json
{ "id": "<uuid>", "email": "ana@acme.test", "displayName": "Ana", "active": true, "roles": ["Vendedor"] }
{ "id": "<uuid>", "name": "Vendedor", "description": "Atiende ventas", "permissions": ["commerce.manage"] }
{ "items": [], "page": 0, "size": 20, "total": 0 }
{ "moduleCode": "identity", "enabled": true, "permissions": [{ "code": "identity.manage", "description": "…" }] }
```

Errores en `application/problem+json` (RFC 7807) con `detail`. `400` es cuerpo o
campos inválidos o permiso inexistente; `404` usuario/rol inexistente; `409` correo
o nombre duplicado, rol en uso u operación que dejaría la instalación sin
administrador. La contraseña se almacena solo como hash `BCrypt` y nunca se
devuelve.

## Uso desde el frontend (BFF)

- `src/lib/admin/identity-api.ts` (cliente de servidor) traduce las respuestas a un
  resultado discriminado `ok` / `validation` / `conflict` / `unauthorized` /
  `notFound` / `unavailable`. Un `400` es `validation`, `401`/`403` es
  `unauthorized`, `404` es `notFound`, `409` es `conflict`; un `5xx`, un fallo de
  red o un tiempo de espera agotado es `unavailable`.
- Las páginas `/admin/usuarios` y `/admin/roles` resuelven todas las operaciones en
  el servidor con el token de la sesión (`Astro.session`), validan los formularios
  en el servidor antes de llamar a la API y responden con `redirect` a un resultado
  (`?ok=…` o `?error=…`).
- Los permisos seleccionables de un rol se cruzan con los módulos habilitados de la
  empresa; los de un módulo no habilitado no se ofrecen ni se conceden (ver
  `selectablePermissionGroups` en `src/lib/module-catalog.ts`). Esto es
  presentación: la autorización real ocurre en el backend.

El navegador solo recibe la cookie de sesión `cuidando_session` (`HttpOnly`,
`SameSite=Lax`, `Secure` en producción). Ningún token ni credencial llega al HTML,
al JavaScript ni a variables `PUBLIC_`.

## Desarrollo sin el backend

`src/lib/admin/identity-fixture.ts` ofrece un fixture local con la forma del
contrato (usuarios, roles, permisos y módulos). Se usa solo en desarrollo y con
activación explícita (`IDENTITY_FIXTURE=true`); en cualquier otro caso la
aplicación consume el contrato real y ante un fallo muestra un estado neutro sin
datos.
