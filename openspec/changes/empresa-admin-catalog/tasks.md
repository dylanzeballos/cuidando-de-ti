# Tareas

## 1. Configuración y cliente BFF

- [x] 1.1 Confirmar que las pantallas usan la sesión de servidor y la empresa de la instalación que aporta `empresa-app-foundation`, sin variables `ADMIN_*` ni `PUBLIC_` con credenciales, y verificar con `npm run check`.
- [x] 1.2 Crear `src/lib/admin/catalog-api.ts` con los DTO y una función por operación (listar/crear categoría y producto, listar sucursales y stock, registrar movimiento) que reciba la identidad y la empresa desde la sesión de servidor y mapee los códigos del backend a `ok`/`validation`/`conflict`/`unauthorized`/`unavailable`, y verificar con pruebas Vitest que usan un `fetch` inyectado.

## 2. Pantalla de catálogo

- [x] 2.1 Implementar `GET /admin/catalogo` dentro del shell y detrás de la sesión, que liste categorías y productos de la empresa, con estados de carga, vacío y error, y verificar que el HTML servido no contiene credenciales ni la URL interna de la API.
- [x] 2.2 Implementar `POST /admin/catalogo` que cree categoría o producto desde `request.formData()`, valide en servidor (con la empresa de la sesión) y redirija con `?ok=` o `?error=`, y verificarlo con un backend simulado (éxito, `409` por SKU duplicado y datos inválidos).

## 3. Pantalla de inventario

- [x] 3.1 Implementar `GET /admin/inventario` dentro del shell y detrás de la sesión, que liste sucursales y muestre el stock de la sucursal seleccionada, con los mismos estados.
- [x] 3.2 Implementar `POST /admin/inventario/movimientos` para entrada, salida y ajuste con redirección PRG, y verificar el caso de conflicto (`409`) sin alterar el stock mostrado.

## 4. Accesibilidad y verificación

- [x] 4.1 Revisar etiquetas de formulario, orden de foco, contraste y ausencia de islas React en las dos pantallas dentro del shell, y verificarlo inspeccionando el HTML servido (verificado: HTML servido de `/admin/catalogo` y `/admin/inventario` con sesión; 0 islas `astro-island`, 0 directivas `client:`, todas las `label` asociadas a su campo por `for`/`id`, orden de foco en el orden del DOM).
- [x] 4.2 Ejecutar `npm run check`, `npm test` y `npm run build` (0 errores, 47 pruebas, build OK) y confirmar el flujo completo end-to-end con sesión contra la API local (crear producto → registrar entrada → ver stock) con un smoke test (verificado: producto creado vía `POST /admin/catalogo`, entrada de 7 unidades vía `POST /admin/inventario`, stock mostrado 7; salida de 999 rechazada con `409` legible y stock sin cambios).
