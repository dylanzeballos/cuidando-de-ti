/**
 * Espacios de trabajo del panel. No son roles de seguridad: el backend sigue
 * autorizando cada operación. Son lentes de interfaz para que una cajera, un
 * encargado de almacén o un contador vean solo lo que necesitan.
 */

export type WorkspaceId = 'administracion' | 'ventas' | 'almacen' | 'contabilidad';

export type Workspace = {
  id: WorkspaceId;
  label: string;
  /** Ruta a la que lleva el espacio al elegirlo. */
  landing: string;
  /** Descripción corta para el selector. */
  hint: string;
  /** Códigos de módulo visibles; `null` significa todos. */
  modules: string[] | null;
};

export const WORKSPACES: readonly Workspace[] = [
  {
    id: 'administracion',
    label: 'Administración',
    landing: '/admin',
    hint: 'Todos los módulos',
    modules: null,
  },
  {
    id: 'ventas',
    label: 'Ventas',
    landing: '/admin/ventas',
    hint: 'Caja y registro de venta',
    modules: ['sales', 'billing', 'commerce', 'catalog', 'crm', 'reports'],
  },
  {
    id: 'almacen',
    label: 'Almacén',
    landing: '/admin/inventario',
    hint: 'Existencias y movimientos',
    modules: ['inventory', 'commerce', 'catalog', 'reports'],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    landing: '/admin/reportes',
    hint: 'Costos, gastos y reportes',
    modules: ['costs', 'billing', 'reports', 'sales'],
  },
];

export const DEFAULT_WORKSPACE: Workspace = WORKSPACES[0]!;

export function isWorkspaceId(value: string | null | undefined): value is WorkspaceId {
  return WORKSPACES.some((workspace) => workspace.id === value);
}

export function getWorkspace(value: string | null | undefined): Workspace {
  return WORKSPACES.find((workspace) => workspace.id === value) ?? DEFAULT_WORKSPACE;
}
