# Tareas

## 1. Sistema de diseño global

- [x] 1.1 Revisar y completar los tokens globales (color, tipografía, espaciado, radios y estados) en `src/styles/global.css`, sin incrustar marca de una empresa concreta; verificar con `npm run check` y `npm run build`.
- [x] 1.2 Extraer la aplicación del tema por empresa a un layout compartido que sobrescriba tokens desde la configuración validada; verificar que dos empresas con temas distintos rinden solo su propio tema y que un tema con contraste insuficiente cae al tema por defecto.
- [x] 1.3 Crear las primitivas de layout y de estados (contenedor, encabezado de sección, panel, estados de carga, vacío y error) en `src/components/`, sin lógica de negocio ni datos de empresa; verificar con pruebas de render o inspección del HTML.
- [x] 1.4 Migrar `src/pages/index.astro` a las primitivas y tokens sin cambiar el comportamiento por dominio; verificar con las pruebas de contrato existentes y `npm run build`.

## 2. Shell modular y panel

- [x] 2.1 Extender `src/lib/module-catalog.ts` con el mapeo código → etiqueta, icono y ruta, y una función pura que calcule la navegación y las tarjetas del panel a partir de los módulos habilitados; verificar con pruebas Vitest para módulo habilitado y no habilitado.
- [x] 2.2 Refactorizar `src/components/admin/admin-shell.astro` para generar la navegación por módulos habilitados, marcar la sección activa de forma accesible, usar landmarks semánticos e incluir un enlace para saltar al contenido; verificar inspeccionando el HTML servido y la navegación por teclado.
- [x] 2.3 Implementar el panel de inicio que lista los módulos habilitados con acceso a su sección y estados de carga, vacío y error; verificar que no muestra módulos no habilitados y que ante un fallo de la API no muestra datos.
- [x] 2.4 Añadir los estados del shell y del panel y su comportamiento responsivo; verificar que a ancho reducido la navegación sigue usable y el contenido no se solapa.

## 3. Sesión e inicio de sesión

- [x] 3.1 Configurar la sesión de Astro en `astro.config.mjs` (`session.cookie` con `HttpOnly`/`SameSite` y el driver adecuado) y las variables privadas necesarias; verificar con `npm run check`.
- [x] 3.2 Definir el contrato `docs/contracts/empresa-auth-session-v1.md` (login, refresh y logout) o alinearlo con el publicado por `empresa-authentication`, y crear `src/lib/auth/auth-api.ts` con los DTO y el mapeo a `ok`/`invalid`/`unavailable`; verificar con pruebas Vitest que usan un `fetch` inyectado.
- [x] 3.3 Implementar el endpoint de inicio de sesión que valide en servidor, llame a la API de autenticación y cree la sesión de servidor, distinguiendo credenciales rechazadas de un fallo temporal; verificar con un backend simulado (éxito, credenciales inválidas y API caída sin crear sesión).
- [x] 3.4 Implementar la página `/entrar` con formulario accesible (etiquetas asociadas, foco visible, errores anunciables) y sin hidratación innecesaria; verificar que el HTML servido no contiene tokens ni credenciales.
- [x] 3.5 Implementar el cierre de sesión que invalide la sesión de servidor antes de redirigir a `/entrar`; verificar que la cookie deja de permitir el acceso a la administración.
- [x] 3.6 Añadir `src/middleware.ts` que proteja `/admin/**`, redirija a `/entrar` sin sesión y adjunte la empresa de la instalación a `Astro.locals`; verificar la redirección sin sesión y el acceso con sesión, y que la empresa no proviene de `query` ni `body`.

## 4. Integración y verificación

- [x] 4.1 Migrar `src/pages/admin/catalogo.astro` y `src/pages/admin/inventario.astro` para usar el shell y la sesión, y retirar el token de administración fijo del esquema `env` y de `.env.example`; verificar que el HTML servido no expone tokens ni la URL interna de la API.
- [x] 4.2 Aplicar `Cache-Control: no-store` y `noindex` a las rutas de sesión y administración; verificar las cabeceras de respuesta.
- [x] 4.3 Actualizar `README.md`/`DESIGN.md` con el flujo de sesión y el sistema de diseño, y ejecutar `npm run check`, `npm test` y `npm run build` con 0 errores.
