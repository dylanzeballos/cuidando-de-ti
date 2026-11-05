# Tareas

## 1. Lógica y cliente

- [x] 1.1 Añadir `transferStock` y los tipos de transferencia a `src/lib/admin/catalog-api.ts`.
- [x] 1.2 Crear `src/lib/admin/inventory.ts` con umbral, estados, filtros y conteos puros.

## 2. Pantalla de inventario

- [x] 2.1 Rediseñar `/admin/inventario` con métricas, selector de sucursal y sucursal por defecto.
- [x] 2.2 Añadir búsqueda por nombre/SKU y filtro por estado de existencias.
- [x] 2.3 Mover sucursal, movimiento y transferencia a formularios plegables con validación de servidor y PRG.
- [x] 2.4 Implementar transferencias entre sucursales con origen y destino distintos.
- [x] 2.5 Convertir la tabla de existencias en tarjetas `data-label` en móvil.

## 3. Verificación

- [x] 3.1 Verificar `/admin/inventario` y sus filtros con la API local (200, estados vacío y con datos).
- [x] 3.2 Revisar el layout a 390 px con captura headless (sin desborde horizontal, formularios apilados y tabla en tarjetas).
- [x] 3.3 Validar el cambio con `openspec validate empresa-inventory-operations`.
- [ ] 3.4 Ejecutar `npm run check` y `npm run build` (pendiente de autorización del usuario).
