import { describe, expect, it } from 'vitest';
import {
  buildModuleViews,
  describeModule,
  filterSelectablePermissions,
  groupModuleViews,
  selectablePermissionCodes,
  selectablePermissionGroups,
} from '@/lib/module-catalog';

describe('buildModuleViews', () => {
  it('incluye el módulo habilitado con su ruta', () => {
    const views = buildModuleViews(['inventory']);
    expect(views).toHaveLength(1);
    expect(views[0]?.route).toBe('/admin/inventario');
    expect(views[0]?.name).toBe('Inventario');
  });

  it('no incluye módulos no habilitados', () => {
    const routes = buildModuleViews(['inventory']).map((view) => view.route);
    expect(routes).not.toContain('/admin/facturacion');
  });

  it('incluye facturación cuando está habilitada', () => {
    const routes = buildModuleViews(['billing']).map((view) => view.route);
    expect(routes).toContain('/admin/facturacion');
  });

  it('incluye costos y gastos cuando el módulo está habilitado', () => {
    const views = buildModuleViews(['costs']);
    expect(views).toHaveLength(1);
    expect(views[0]?.name).toBe('Costos y gastos');
    expect(views[0]?.route).toBe('/admin/costos');
    expect(views[0]?.icon).toBe('costs');
  });

  it('deduplica códigos repetidos manteniendo el orden', () => {
    expect(buildModuleViews(['commerce', 'commerce', 'crm']).map((view) => view.code)).toEqual([
      'commerce',
      'crm',
    ]);
  });

  it('da una etiqueta legible y sin ruta a un módulo desconocido', () => {
    const [view] = buildModuleViews(['reports_v2']);
    expect(view?.name).toBe('Reports V2');
    expect(view?.route).toBeNull();
  });
});

describe('describeModule', () => {
  it('describe un código conocido para la portada pública', () => {
    expect(describeModule('billing').name).toBe('Facturación');
  });

  it('describe el módulo de identidad con su ruta de administración', () => {
    const view = describeModule('identity');
    expect(view.route).toBe('/admin/usuarios');
    expect(view.name).toBe('Usuarios y roles');
  });

  it('describe el módulo de costos con su ruta de administración', () => {
    expect(describeModule('costs')).toEqual({
      code: 'costs',
      name: 'Costos y gastos',
      description: 'Costo de compra, margen y gastos operativos por periodo.',
      icon: 'costs',
      group: 'finanzas',
      route: '/admin/costos',
    });
  });

  it('da una presentación genérica y sin ruta a un código desconocido', () => {
    expect(describeModule('cost_centers')).toEqual({
      code: 'cost_centers',
      name: 'Cost Centers',
      description: '',
      icon: 'generic',
      group: 'otros',
      route: null,
    });
  });
});

describe('groupModuleViews', () => {
  it('agrupa por bloque en el orden de navegación y omite los bloques vacíos', () => {
    const groups = groupModuleViews(buildModuleViews(['identity', 'catalog', 'sales', 'costs']));
    expect(groups.map((group) => group.id)).toEqual(['operacion', 'finanzas', 'administracion']);
    expect(groups[0]?.label).toBe('Operación');
    expect(groups[0]?.views.map((view) => view.code)).toEqual(['catalog', 'sales']);
    expect(groups[1]?.views.map((view) => view.code)).toEqual(['costs']);
    expect(groups[2]?.views.map((view) => view.code)).toEqual(['identity']);
  });

  it('coloca los módulos desconocidos al final en «Otros»', () => {
    const groups = groupModuleViews(buildModuleViews(['catalog', 'reports_v2']));
    expect(groups.map((group) => group.id)).toEqual(['operacion', 'otros']);
    expect(groups.at(-1)?.views.map((view) => view.code)).toEqual(['reports_v2']);
  });

  it('devuelve una lista vacía sin módulos', () => {
    expect(groupModuleViews(buildModuleViews([]))).toEqual([]);
  });
});

const PERMISSION_GROUPS = [
  { moduleCode: 'identity', enabled: true, permissions: [{ code: 'identity.manage', description: '…' }] },
  { moduleCode: 'commerce', enabled: true, permissions: [{ code: 'commerce.manage', description: '…' }] },
  { moduleCode: 'billing', enabled: true, permissions: [{ code: 'billing.manage', description: '…' }] },
  { moduleCode: 'inventory', enabled: false, permissions: [{ code: 'inventory.manage', description: '…' }] },
];

describe('selectablePermissionGroups', () => {
  it('ofrece los permisos de un módulo habilitado y habilitado por la API', () => {
    const groups = selectablePermissionGroups(PERMISSION_GROUPS, ['identity', 'commerce']);
    expect(groups.map((group) => group.moduleCode)).toEqual(['identity', 'commerce']);
  });

  it('no ofrece permisos de un módulo no habilitado para la empresa', () => {
    const codes = selectablePermissionCodes(PERMISSION_GROUPS, ['identity']);
    expect(codes.has('billing.manage')).toBe(false);
    expect(codes.has('commerce.manage')).toBe(false);
    expect(codes.has('identity.manage')).toBe(true);
  });

  it('no ofrece permisos de un módulo deshabilitado por la API aunque esté en la empresa', () => {
    const groups = selectablePermissionGroups(PERMISSION_GROUPS, ['inventory']);
    expect(groups).toHaveLength(0);
  });
});

describe('filterSelectablePermissions', () => {
  it('no concede un módulo deshabilitado con permisos previos', () => {
    const result = filterSelectablePermissions(
      ['identity.manage', 'billing.manage'],
      PERMISSION_GROUPS,
      ['identity'],
    );
    expect(result).toEqual(['identity.manage']);
  });

  it('deduplica y conserva el orden', () => {
    const result = filterSelectablePermissions(
      ['commerce.manage', 'identity.manage', 'commerce.manage'],
      PERMISSION_GROUPS,
      ['identity', 'commerce'],
    );
    expect(result).toEqual(['commerce.manage', 'identity.manage']);
  });
});
