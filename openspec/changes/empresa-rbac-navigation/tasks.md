# Tareas

## 1. Perfil y reglas de acceso

- [x] 1.1 Consumir `GET /api/v1/identity/me` desde el middleware y publicar roles y permisos en `Astro.locals.access`.
- [x] 1.2 Crear `src/lib/admin/access.ts` con módulos, rutas protegidas y primer destino permitido, con pruebas unitarias.

## 2. Navegación y rutas

- [x] 2.1 Filtrar los módulos del shell por permisos y ocultar Configuración sin `identity.manage`.
- [x] 2.2 Bloquear por URL las secciones de `/admin/**` y servir una página 403.
- [x] 2.3 Adaptar las tarjetas, paneles y accesos rápidos del inicio a los permisos.

## 3. Costos y gastos

- [x] 3.1 Hacer que el selector de sucursal conserve la sección y los filtros en costos e inventario.
- [x] 3.2 Ocultar los enlaces a inventario o catálogo cuando la cuenta no puede administrarlos.

## 4. Verificación

- [ ] 4.1 Revisar `/admin/costos`, `/admin/gastos` y sus subrutas con una cuenta de solo ventas.
- [ ] 4.2 Ejecutar `npm run check` y `npm run build` (pendiente de autorización del usuario).
- [ ] 4.3 Validar el cambio con `openspec validate empresa-rbac-navigation`.
