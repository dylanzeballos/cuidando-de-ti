# Tareas

## 1. Preparación y contrato

- [x] 1.1 Añadir la entrada `costs` a `src/lib/module-catalog.ts` (etiqueta, icono y ruta hacia costos/gastos) sin incrustar datos de una empresa concreta; verificar con pruebas Vitest que un código habilitado y uno desconocido devuelven la presentación esperada.
- [x] 1.2 Definir `docs/contracts/empresa-costs-v1.md` (costos por producto/sucursal y gastos operativos por periodo) alineado con la forma del fixture, o anotar la dependencia con el contrato que publicará el backend; verificar que la forma documentada coincide con los tipos del cliente.

## 2. Cliente de servidor y fixture

- [x] 2.1 Crear `src/lib/admin/costs-api.ts` con `createCostsClient` (`baseUrl`, `token`, `empresa` y `fetchImpl` inyectable) y el resultado discriminado `ok`/`validation`/`conflict`/`unauthorized`/`notFound`/`unavailable`; verificar con `npm run check`.
- [x] 2.2 Escribir las pruebas Vitest de `costs-api.ts` con `fetch` inyectado para listar costos, registrar un costo, listar gastos, registrar un gasto y mapear `400`, `409` y fallo de red a sus estados; verificar con `npm test`.
- [x] 2.3 Crear `src/lib/admin/costs-fixture.ts` que replique la forma del contrato (productos con precio, costos por sucursal, gastos por periodo) y exponga respuestas de éxito y de error; verificar con pruebas Vitest que el cliente consume el fixture sin backend.

## 3. Pantalla de costos

- [x] 3.1 Implementar `src/pages/admin/costos.astro` dentro del shell y la sesión de `empresa-app-foundation`: listar productos con precio de venta, costo y margen calculado en el servidor, distinguiendo "sin costo registrado" de "margen cero" y mostrando el margen negativo; verificar inspeccionando el HTML servido.
- [x] 3.2 Añadir el formulario SSR de registro o actualización de costo por producto y sucursal con validación de servidor (monto no negativo) y patrón POST-redirect-GET con mensaje accesible; verificar que un costo inválido no llama a la API y que uno válido aparece en el listado.
- [x] 3.3 Verificar que la identidad y la empresa provienen de la sesión (`Astro.locals`) y no de `query` ni `body`, y que el HTML y el JavaScript entregados no contienen el token ni la URL interna de la API; ejecutar `npm test`.
- [x] 3.4 Resolver los estados de carga, vacío (empresa sin productos) y error (API no disponible) con las primitivas del sistema de diseño en `/admin/costos`; verificar que ante `unavailable` no se muestra ninguna lista con datos.

## 4. Pantalla de gastos

- [x] 4.1 Implementar `src/pages/admin/gastos.astro` con el formulario de registro (concepto, monto no negativo y periodo) y el patrón POST-redirect-GET; verificar que un gasto rechazado por el backend se muestra como error legible y no se añade al listado.
- [x] 4.2 Listar los gastos del periodo consultado y mostrar su total; verificar que un periodo sin gastos presenta un estado vacío con total cero y no un error.
- [x] 4.3 Resolver los estados de carga, vacío y error con las primitivas del sistema de diseño en `/admin/gastos`; verificar el mensaje neutro ante API no disponible.

## 5. Acceso, accesibilidad y verificación

- [x] 5.1 Comprobar que sin sesión `/admin/costos` y `/admin/gastos` redirigen al inicio de sesión y que una empresa sin el módulo `costs` no ve esos accesos en la navegación; verificar inspeccionando la respuesta y el HTML.
- [x] 5.2 Revisar accesibilidad: HTML semántico, etiquetas asociadas, foco visible, contraste suficiente, orden de tabulación lógico, mensajes anunciables sin depender del color y soporte de movimiento reducido; verificar con navegación por teclado y los criterios de `.agents/skills/web-design-guidelines/SKILL.md`.
- [x] 5.3 Aplicar `Cache-Control: no-store` y `noindex` a `/admin/costos` y `/admin/gastos`; verificar las cabeceras de respuesta.
- [x] 5.4 Confirmar que no se añaden variables `PUBLIC_` con credenciales ni valores `ADMIN_*` nuevas y documentar el flujo en `README.md`; verificar con `npm run check`.
- [x] 5.5 Ejecutar `npm run check`, `npm test` y `npm run build` con 0 errores e informar de cualquier bloqueo antes de continuar.
