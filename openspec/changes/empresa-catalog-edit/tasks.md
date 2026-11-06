# Tareas

## 1. Cliente y validación

- [x] 1.1 Añadir `updateProduct`, `updateCategory` y `UpdateProductInput` al cliente.
- [x] 1.2 Separar los DTO en `src/lib/admin/catalog-types.ts` y reexportarlos.
- [x] 1.3 Crear `handleCatalogPost` con validación de servidor para crear, editar y cambiar estado.

## 2. Interfaz de edición

- [x] 2.1 Crear el diálogo modal de edición de producto con todos los campos editables.
- [x] 2.2 Añadir la columna de acciones y el acceso a editar en la tabla de productos.
- [x] 2.3 Añadir activar/desactivar productos y categorías con confirmación.
- [x] 2.4 Crear el controlador de diálogos compartido y migrar el diálogo de roles.
- [x] 2.5 Reabrir el diálogo del producto cuando la API rechaza la edición y conservar filtros.

## 3. Marca, SKU automático y formularios modales

- [x] 3.1 Compartir los campos de producto entre alta y edición en `product-fields.astro`.
- [x] 3.2 Migrar el alta de producto y de categoría a diálogos modales con reapertura tras error.
- [x] 3.3 Centralizar las reglas en `catalog-schema.ts` con Zod para servidor y navegador, y mostrar errores por campo.
- [x] 3.4 Añadir la marca al producto, retirar el SKU del formulario y mostrar el SKU generado en la tabla.
- [x] 3.5 Retirar impuesto y código de barras del formulario, la tabla, el contrato y el desglose de ventas.

## 4. Verificación

- [x] 3.1 Verificar `/admin/catalogo` y `/admin/usuarios` con la API local (200 y sin errores de compilación).
- [x] 3.2 Probar un cambio de estado real y su restauración, y comprobar la redirección de error.
- [x] 3.3 Revisar el layout a 390 px con captura headless (sin desborde y diálogo usable).
- [x] 3.4 Validar el cambio con `openspec validate empresa-catalog-edit`.
- [ ] 3.5 Ejecutar `npm run check` y `npm run build` (pendiente de autorización del usuario).
