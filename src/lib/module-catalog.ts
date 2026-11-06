import type { PermissionGroup } from '@/lib/admin/identity-api';

export type ModuleIconName =
  | 'catalog'
  | 'inventory'
  | 'sales'
  | 'costs'
  | 'billing'
  | 'commerce'
  | 'customers'
  | 'identity'
  | 'reports'
  | 'home'
  | 'medicine'
  | 'generic';

/** Bloque de navegación al que pertenece un módulo en el shell de administración. */
export type ModuleGroup = 'operacion' | 'analitica' | 'finanzas' | 'administracion' | 'otros';

/** Orden y etiqueta de los bloques de navegación. Solo presentación. */
export const MODULE_GROUP_ORDER: readonly ModuleGroup[] = [
  'operacion',
  'analitica',
  'finanzas',
  'administracion',
  'otros',
];

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
  operacion: 'Operación',
  analitica: 'Analítica',
  finanzas: 'Finanzas',
  administracion: 'Administración',
  otros: 'Otros',
};

export type ModulePresentation = {
  /** Código público del módulo tal como lo publica la API. */
  code: string;
  name: string;
  description: string;
  icon: ModuleIconName;
  /** Bloque de la navegación donde se agrupa el módulo. */
  group: ModuleGroup;
  /** Sección de administración del módulo; `null` si aún no tiene pantalla. */
  route: string | null;
};

/** Presentación por código de módulo. Solo aporta texto y ruta; no autoriza. */
const CATALOG: Record<string, Omit<ModulePresentation, 'code'>> = {
  catalog: {
    name: 'Catálogo',
    description: 'Medicamentos, productos y categorías de la farmacia.',
    icon: 'catalog',
    group: 'operacion',
    route: '/admin/catalogo',
  },
  inventory: {
    name: 'Inventario',
    description: 'Sucursales, existencias y movimientos de productos.',
    icon: 'inventory',
    group: 'operacion',
    route: '/admin/inventario',
  },
  sales: {
    name: 'Ventas',
    description: 'Caja, registro de ventas, comprobantes y devoluciones.',
    icon: 'sales',
    group: 'operacion',
    route: '/admin/ventas',
  },
  costs: {
    name: 'Costos y gastos',
    description: 'Costo de compra, margen y gastos operativos por periodo.',
    icon: 'costs',
    group: 'finanzas',
    route: '/admin/costos',
  },
  billing: {
    name: 'Facturación',
    description: 'Facturas con NIT, estados del SIAT y anulaciones.',
    icon: 'billing',
    group: 'finanzas',
    route: '/admin/facturacion',
  },
  reports: {
    name: 'Reportes',
    description: 'Indicadores de ventas, margen, gastos e inventario.',
    icon: 'reports',
    group: 'analitica',
    route: '/admin/reportes',
  },
  commerce: {
    name: 'Productos',
    description: 'Catálogo, precios y disponibilidad de la farmacia.',
    icon: 'medicine',
    group: 'operacion',
    route: '/admin/catalogo',
  },
  crm: {
    name: 'Pacientes y clientes',
    description: 'Datos de pacientes, clientes y su historial.',
    icon: 'customers',
    group: 'operacion',
    route: '/admin/clientes',
  },
  identity: {
    name: 'Usuarios y roles',
    description: 'Cuentas, roles y permisos de la empresa.',
    icon: 'identity',
    group: 'administracion',
    route: '/admin/usuarios',
  },
};

function formatCode(code: string): string {
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

/** Describe un código de módulo. Los códigos desconocidos reciben una etiqueta legible. */
export function describeModule(code: string): ModulePresentation {
  const known = CATALOG[code];
  if (known) return { code, ...known };
  return { code, name: formatCode(code), description: '', icon: 'generic', group: 'otros', route: null };
}

/**
 * Calcula las vistas de presentación (navegación y tarjetas del panel) a partir
 * de los módulos habilitados. Es pura: no consulta la API ni autoriza nada, solo
 * traduce códigos a etiquetas, iconos y rutas. Deduplica manteniendo el orden.
 */
export function buildModuleViews(enabledModules: readonly string[]): ModulePresentation[] {
  const seen = new Set<string>();
  const views: ModulePresentation[] = [];
  for (const code of enabledModules) {
    if (seen.has(code)) continue;
    seen.add(code);
    views.push(describeModule(code));
  }
  return views;
}

export type ModuleGroupView = {
  id: ModuleGroup;
  label: string;
  views: ModulePresentation[];
};

/**
 * Agrupa las vistas por bloque de navegación para el shell. Es pura y no
 * descarta módulos: los que caen en `otros` van al final. Un bloque sin módulos
 * no se devuelve para no dejar secciones vacías en la navegación.
 */
export function groupModuleViews(views: readonly ModulePresentation[]): ModuleGroupView[] {
  const groups: ModuleGroupView[] = [];
  for (const id of MODULE_GROUP_ORDER) {
    const grouped = views.filter((view) => view.group === id);
    if (grouped.length > 0) groups.push({ id, label: MODULE_GROUP_LABELS[id], views: grouped });
  }
  return groups;
}

/**
 * Permisos seleccionables para un rol: cruza el catálogo de permisos que devuelve
 * la API con los módulos habilitados de la empresa. Un grupo de un módulo no
 * habilitado (o marcado como no habilitado por la API) no se ofrece. Es pura:
 * solo filtra presentación; el backend autoriza cada operación.
 */
export function selectablePermissionGroups(
  groups: readonly PermissionGroup[],
  enabledModules: readonly string[],
): PermissionGroup[] {
  const enabled = new Set(enabledModules);
  return groups
    .filter((group) => group.enabled && enabled.has(group.moduleCode))
    .map((group) => ({ ...group, permissions: [...group.permissions] }));
}

/** Códigos de permiso seleccionables según los módulos habilitados. */
export function selectablePermissionCodes(
  groups: readonly PermissionGroup[],
  enabledModules: readonly string[],
): Set<string> {
  const codes = new Set<string>();
  for (const group of selectablePermissionGroups(groups, enabledModules)) {
    for (const permission of group.permissions) codes.add(permission.code);
  }
  return codes;
}

/**
 * Filtra una lista de códigos de permiso a los seleccionables, conservando el
 * orden y sin duplicados. Un permiso de un módulo no habilitado no se concede,
 * aunque venga en la solicitud (un módulo deshabilitado con permisos previos no
 * se concede).
 */
export function filterSelectablePermissions(
  codes: readonly string[],
  groups: readonly PermissionGroup[],
  enabledModules: readonly string[],
): string[] {
  const selectable = selectablePermissionCodes(groups, enabledModules);
  const result: string[] = [];
  for (const code of codes) {
    if (selectable.has(code) && !result.includes(code)) result.push(code);
  }
  return result;
}
