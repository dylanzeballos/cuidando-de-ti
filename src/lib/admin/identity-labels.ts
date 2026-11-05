import { describeModule } from '@/lib/module-catalog';
import type { PermissionGroup } from '@/lib/admin/identity-api';

/** Nombre del módulo al que pertenece cada permiso (Facturación, Productos…). */
export function buildPermissionModuleLabels(
  groups: readonly PermissionGroup[],
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const group of groups) {
    const moduleName = describeModule(group.moduleCode).name;
    for (const permission of group.permissions) {
      labels.set(permission.code, moduleName);
    }
  }
  return labels;
}

export function countPermissions(groups: readonly PermissionGroup[]): number {
  return groups.reduce((sum, group) => sum + group.permissions.length, 0);
}
