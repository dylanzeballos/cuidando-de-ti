# Tareas

## 1. Cliente de identidad y datos

- [x] 1.1 Definir `docs/contracts/empresa-identity-admin-v1.md` (usuarios, roles y permisos) o alinearlo con el publicado por `empresa-authentication`, y crear `src/lib/admin/identity-api.ts` con los DTO y el mapeo a `ok`/`validation`/`conflict`/`unauthorized`/`unavailable`; verificar con pruebas Vitest de cada mapeo usando un `fetch` inyectado.
- [x] 1.2 Crear un fixture local con la forma del contrato (usuarios, roles, permisos y módulos) para desarrollar sin el backend y verificar que la aplicación lo usa solo cuando el contrato no está disponible.
- [x] 1.3 Extender `src/lib/module-catalog.ts` con el mapeo del módulo de usuarios (código → etiqueta, icono y ruta) y una función pura que devuelva los permisos seleccionables cruzando los permisos de la API con los módulos habilitados; verificar con pruebas Vitest para módulo habilitado y no habilitado.

## 2. Administración de usuarios

- [x] 2.1 Implementar `/admin/usuarios` (SSR, dentro del shell) que liste los usuarios de la empresa con su estado y roles, y estados de carga, vacío y error; verificar que no muestra usuarios ante un fallo de la API y que no consulta ninguna empresa elegida por el cliente.
- [x] 2.2 Implementar el alta de usuario con formulario accesible (`label` asociado, foco visible, errores anunciables) y validación en servidor antes de llamar a la API; verificar que datos inválidos no llaman a la API y que un conflicto muestra un mensaje legible sin duplicar el usuario.
- [x] 2.3 Implementar activar y desactivar usuario mediante `POST` a un endpoint Astro con validación en servidor y `redirect` con resultado; verificar que el listado refleja el nuevo estado.
- [x] 2.4 Implementar asignar y retirar los roles de un usuario, ofreciendo solo roles definidos en la empresa; verificar que el listado refleja la asignación y que un rol inexistente no se aplica.

## 3. Roles y permisos

- [x] 3.1 Implementar `/admin/roles` (SSR, dentro del shell) que liste los roles de la empresa con estados de carga, vacío y error; verificar el estado vacío y que no muestra datos ante un fallo de la API.
- [x] 3.2 Implementar crear y editar rol con formulario accesible y validación en servidor; verificar que los cambios se guardan y se reflejan.
- [x] 3.3 Implementar la selección de permisos por módulo habilitado en el formulario de rol; verificar que no se ofrecen permisos de módulos no habilitados y que un módulo deshabilitado con permisos previos no se concede.
- [x] 3.4 Implementar la eliminación de rol con advertencia cuando siga asignado a usuarios; verificar que advierte y no elimina sin confirmación.

## 4. Integración segura y accesibilidad

- [x] 4.1 Resolver todas las operaciones con el cliente de servidor y la identidad de la sesión (`Astro.locals`), sin tokens ni la URL interna de la API en el HTML o el JavaScript; verificar inspeccionando el HTML y el JS servidos.
- [x] 4.2 Aplicar `Cache-Control: no-store` y `noindex` a `/admin/usuarios` y `/admin/roles`; verificar las cabeceras de respuesta.
- [x] 4.3 Verificar accesibilidad (tablas semánticas, teclado, foco visible, `role="alert"` en errores y respeto por `prefers-reduced-motion`) e hidratar solo el control interactivo estrictamente necesario.

## 5. Documentación y verificación final

- [x] 5.1 Actualizar `README.md`/`DESIGN.md` con la administración de usuarios y roles y su dependencia del contrato de identidad; verificar que el fixture local y la sustitución por el contrato real quedan documentados.
- [x] 5.2 Ejecutar `npm run check`, `npm test` y `npm run build` con 0 errores e informar de cualquier bloqueo real (por ejemplo, contrato de backend aún no publicado).
