import type { PermissionGroup } from '@/lib/admin/identity-api';

/** Etiquetas legibles por código de permiso y conteo para la pantalla de roles. */
export function buildPermissionLabels(groups: readonly PermissionGroup[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const group of groups) {
    for (const permission of group.permissions) {
      labels.set(permission.code, permission.description || permission.code);
    }
  }
  return labels;
}

export function countPermissions(groups: readonly PermissionGroup[]): number {
  return groups.reduce((sum, group) => sum + group.permissions.length, 0);
}
