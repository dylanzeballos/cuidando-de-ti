import { describe, expect, it } from 'vitest';
import {
  canAccessModule,
  canAccessPath,
  firstAllowedRoute,
  hasAnyPermission,
} from '@/lib/admin/access';

describe('hasAnyPermission', () => {
  it('acepta cuando coincide al menos un permiso', () => {
    expect(hasAnyPermission(['sales.manage'], ['costs.manage', 'sales.manage'])).toBe(true);
  });

  it('rechaza cuando no hay coincidencias y acepta listas vacías', () => {
    expect(hasAnyPermission(['sales.manage'], ['costs.manage'])).toBe(false);
    expect(hasAnyPermission([], [])).toBe(true);
  });
});

describe('canAccessModule', () => {
  it('exige el permiso del módulo conocido', () => {
    expect(canAccessModule('costs', ['costs.manage'])).toBe(true);
    expect(canAccessModule('costs', ['sales.manage'])).toBe(false);
    expect(canAccessModule('inventory', ['sales.manage'])).toBe(false);
  });

  it('deja pasar módulos desconocidos para no romper códigos nuevos', () => {
    expect(canAccessModule('nuevo_modulo', [])).toBe(true);
  });

  it('reserva reportes a quien administra costos', () => {
    expect(canAccessModule('reports', ['costs.manage'])).toBe(true);
    expect(canAccessModule('reports', ['sales.manage'])).toBe(false);
    expect(canAccessModule('reports', ['identity.manage'])).toBe(false);
  });
});

describe('canAccessPath', () => {
  it('bloquea una sección sin su permiso y sus subrutas', () => {
    expect(canAccessPath('/admin/costos', ['sales.manage'])).toBe(false);
    expect(canAccessPath('/admin/costos/123', ['sales.manage'])).toBe(false);
    expect(canAccessPath('/admin/ventas/historial', ['sales.manage'])).toBe(true);
  });

  it('permite la raíz del panel y rutas desconocidas', () => {
    expect(canAccessPath('/admin', [])).toBe(true);
    expect(canAccessPath('/admin/otra-cosa', [])).toBe(true);
  });
});

describe('firstAllowedRoute', () => {
  it('elige el primer módulo disponible en orden de uso', () => {
    expect(firstAllowedRoute(['costs.manage'])).toBe('/admin/costos');
    expect(firstAllowedRoute(['identity.manage'])).toBe('/admin/usuarios');
    expect(firstAllowedRoute([])).toBe('/admin');
  });
});
