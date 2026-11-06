/**
 * Reglas de presentación para el control de acceso en el panel. No sustituyen
 * la autorización del backend: solo deciden qué opciones se muestran y qué
 * rutas se bloquean antes de llamar a la API.
 */

const COMMERCE = ['commerce.manage'] as const;
const INVENTORY = ['inventory.manage'] as const;
const SALES = ['sales.manage'] as const;
const COSTS = ['costs.manage'] as const;
const BILLING = ['billing.manage'] as const;
const CRM = ['crm.manage'] as const;
const IDENTITY = ['identity.manage'] as const;
// Reportes es una vista financiera: se reserva a quien administra costos.
const REPORTS = COSTS;

/** Permiso(s) que habilitan un módulo; basta con uno de la lista. */
const MODULE_PERMISSIONS: Record<string, readonly string[]> = {
  catalog: COMMERCE,
  commerce: COMMERCE,
  inventory: INVENTORY,
  sales: SALES,
  costs: COSTS,
  billing: BILLING,
  crm: CRM,
  identity: IDENTITY,
  reports: REPORTS,
};

type RouteGuard = { prefix: string; permissions: readonly string[] };

/** Rutas protegidas por permiso; se evalúa el prefijo más específico primero. */
const ROUTE_GUARDS: readonly RouteGuard[] = [
  { prefix: '/admin/catalogo', permissions: COMMERCE },
  { prefix: '/admin/inventario', permissions: INVENTORY },
  { prefix: '/admin/ventas', permissions: SALES },
  { prefix: '/admin/caja', permissions: SALES },
  { prefix: '/admin/clientes', permissions: CRM },
  { prefix: '/admin/costos', permissions: COSTS },
  { prefix: '/admin/gastos', permissions: COSTS },
  { prefix: '/admin/facturacion', permissions: BILLING },
  { prefix: '/admin/reportes', permissions: REPORTS },
  { prefix: '/admin/usuarios', permissions: IDENTITY },
  { prefix: '/admin/roles', permissions: IDENTITY },
];

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => permissions.includes(permission));
}

/** Indica si un código de módulo debe mostrarse para los permisos dados. */
export function canAccessModule(code: string, permissions: readonly string[]): boolean {
  const required = MODULE_PERMISSIONS[code];
  return required === undefined ? true : hasAnyPermission(permissions, required);
}

/**
 * Indica si la ruta puede renderizarse. Las rutas fuera de `/admin` y la raíz
 * `/admin` se permiten; las secciones conocidas exigen su permiso.
 */
export function canAccessPath(pathname: string, permissions: readonly string[]): boolean {
  const guard = ROUTE_GUARDS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return guard === undefined ? true : hasAnyPermission(permissions, guard.permissions);
}

/**
 * Primera sección disponible para una cuenta, en orden de uso habitual. Sirve
 * como destino cuando la ruta solicitada no está permitida.
 */
export function firstAllowedRoute(permissions: readonly string[]): string {
  const candidates: readonly { code: string; route: string }[] = [
    { code: 'sales', route: '/admin/ventas' },
    { code: 'costs', route: '/admin/costos' },
    { code: 'inventory', route: '/admin/inventario' },
    { code: 'catalog', route: '/admin/catalogo' },
    { code: 'billing', route: '/admin/facturacion' },
    { code: 'identity', route: '/admin/usuarios' },
    { code: 'reports', route: '/admin/reportes' },
  ];
  return candidates.find((item) => canAccessModule(item.code, permissions))?.route ?? '/admin';
}
