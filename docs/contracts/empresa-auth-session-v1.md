# Contrato de sesión de autenticación de la empresa (v1) — vista del frontend

El contrato canónico vive en el backend hermano:
`../plataforma-core-api/docs/contracts/empresa-auth-session-v1.md`. Este documento
resume el contrato publicado y describe cómo lo consume `plataforma-web` con el
patrón BFF; no lo redefine ni lo duplica.

Una instalación sirve a **una sola empresa**: la empresa es implícita y no se
selecciona por petición. Las rutas no aceptan identificador ni encabezado de
selección de empresa.

## Endpoints

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | `{ "email", "password" }` | `200` `{ accessToken, tokenType, expiresIn, refreshToken }` |
| `POST` | `/api/v1/auth/refresh` | `{ "refreshToken" }` | `200` mismo cuerpo que `login` (rota el token) |
| `POST` | `/api/v1/auth/logout` | `{ "refreshToken" }` | `204` sin cuerpo (idempotente) |

Errores en `application/problem+json` (RFC 7807). `401` es uniforme (no revela
si el correo existe). `400` es cuerpo mal formado o campos ausentes.

## Uso desde el frontend (BFF)

- `src/lib/auth/auth-api.ts` (cliente de servidor) traduce las respuestas a
  `ok` / `invalid` / `unavailable`. Un `401`/`400` es `invalid`; un `5xx`, un
  fallo de red o un tiempo de espera agotado es `unavailable`.
- `src/pages/api/auth/login.ts` valida en el servidor, llama a `login`, y guarda
  identidad y tokens en `Astro.session`. Ante `invalid` o `unavailable` **no**
  crea sesión.
- `src/pages/api/auth/logout.ts` revoca el token de refresco y destruye la
  sesión de servidor antes de redirigir a `/entrar`.
- `src/middleware.ts` exige sesión para `/admin/**` y deduce la empresa del
  servidor, nunca de `query` ni `body`.

El navegador solo recibe la cookie de sesión `cuidando_session` (`HttpOnly`,
`SameSite=Lax`, `Secure` en producción). Ningún token ni credencial llega al
HTML, al JavaScript ni a variables `PUBLIC_`.

## Autorización posterior

Los permisos efectivos (roles y módulos habilitados) se evalúan en el servidor.
El frontend no declara permisos: la visibilidad de un módulo es presentación y
el backend vuelve a autorizar cada operación (`403` si falta el permiso).
