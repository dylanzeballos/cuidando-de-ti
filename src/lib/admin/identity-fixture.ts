import {
  createIdentityClient,
  type IdentityClient,
  type PermissionGroup,
  type Role,
  type UserAccount,
} from '@/lib/admin/identity-api';
import type { FetchLike } from '@/lib/site-client';

/**
 * Fixture local con la forma del contrato `empresa-identity-admin-v1`
 * (usuarios, roles, permisos y módulos). Sirve para desarrollar y probar sin el
 * backend. La aplicación solo lo usa cuando el contrato no está disponible: en
 * desarrollo y con activación explícita (`IDENTITY_FIXTURE=true`). Ver la decisión
 * documentada en `identity-service.ts`.
 */

export type IdentityFixture = {
  users: UserAccount[];
  roles: Role[];
  permissions: PermissionGroup[];
};

/** Módulos de la empresa del fixture: `billing` queda deshabilitado a propósito. */
export function createIdentityFixtureStore(): IdentityFixture {
  const roles: Role[] = [
    { id: 'role-vendedor', name: 'Farmacéutico', description: 'Atiende el registro de ventas', permissions: ['commerce.manage'] },
    { id: 'role-almacen', name: 'Almacén', description: 'Controla stock', permissions: ['inventory.manage'] },
  ];
  const users: UserAccount[] = [
    { id: 'user-ana', email: 'ana@acme.test', displayName: 'Ana', active: true, roles: ['Vendedor'] },
    { id: 'user-beto', email: 'beto@acme.test', displayName: 'Beto', active: false, roles: [] },
  ];
  const permissions: PermissionGroup[] = [
    {
      moduleCode: 'identity',
      enabled: true,
      permissions: [
        { code: 'identity.manage', description: 'Administrar usuarios, roles y permisos' },
      ],
    },
    {
      moduleCode: 'commerce',
      enabled: true,
      permissions: [{ code: 'commerce.manage', description: 'Operar el catálogo de la farmacia' }],
    },
    {
      moduleCode: 'inventory',
      enabled: true,
      permissions: [{ code: 'inventory.manage', description: 'Operar el inventario' }],
    },
    {
      moduleCode: 'billing',
      enabled: false,
      permissions: [{ code: 'billing.manage', description: 'Emitir documentos fiscales' }],
    },
  ];
  return { users, roles, permissions };
}

function json(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function problem(detail: string, status: number): Response {
  return json({ type: 'about:blank', title: 'Error', status, detail, timestamp: 'fixture' }, status);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readBody(init?: RequestInit): Record<string, unknown> {
  if (init?.body === undefined || init.body === null) return {};
  try {
    const parsed = JSON.parse(String(init.body)) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * `FetchLike` que responde como el contrato de administración de identidad con
 * estado en memoria. Cada cliente de fixture tiene su propio almacén.
 */
export function createIdentityFixtureFetch(store: IdentityFixture = createIdentityFixtureStore()): FetchLike {
  const allPermissionCodes = new Set(store.permissions.flatMap((group) => group.permissions.map((p) => p.code)));
  const roleById = (id: string) => store.roles.find((role) => role.id === id);
  const userById = (id: string) => store.users.find((user) => user.id === id);

  return async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = readBody(init);

    if (path.endsWith('/admin/identity/permissions') && method === 'GET') {
      return json(store.permissions);
    }

    if (path.endsWith('/admin/identity/roles') && method === 'GET') {
      return json([...store.roles].sort((a, b) => a.name.localeCompare(b.name)));
    }

    if (path.endsWith('/admin/identity/roles') && method === 'POST') {
      const name = String(body.name ?? '').trim();
      if (name.length === 0) return problem('El nombre es obligatorio.', 400);
      if (store.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
        return problem('Ya existe un rol con ese nombre.', 409);
      }
      const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];
      if (permissions.some((code) => !allPermissionCodes.has(code))) {
        return problem('Permiso inexistente.', 400);
      }
      const role: Role = {
        id: `role-${store.roles.length + 1}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        description: typeof body.description === 'string' && body.description.length > 0 ? body.description : null,
        permissions,
      };
      store.roles.push(role);
      return json(role, 201);
    }

    const roleMatch = path.match(/\/admin\/identity\/roles\/([^/]+)$/);
    if (roleMatch) {
      const id = decodeURIComponent(roleMatch[1] ?? '');
      const role = roleById(id);
      if (method === 'GET') return role ? json(role) : problem('El rol no existe.', 404);
      if (method === 'DELETE') {
        if (!role) return problem('El rol no existe.', 404);
        const assigned = store.users.filter((user) => user.roles.includes(role.name)).length;
        if (assigned > 0) return problem(`El rol está asignado a ${assigned} usuario(s).`, 409);
        store.roles = store.roles.filter((item) => item.id !== id);
        return json(undefined, 204);
      }
      if (method === 'PUT') {
        if (!role) return problem('El rol no existe.', 404);
        const name = String(body.name ?? '').trim();
        if (name.length === 0) return problem('El nombre es obligatorio.', 400);
        if (store.roles.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
          return problem('Ya existe un rol con ese nombre.', 409);
        }
        const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];
        if (permissions.some((code) => !allPermissionCodes.has(code))) {
          return problem('Permiso inexistente.', 400);
        }
        const previousName = role.name;
        role.name = name;
        role.description =
          typeof body.description === 'string' && body.description.length > 0 ? body.description : null;
        role.permissions = permissions;
        // Los cambios de nombre se reflejan en los usuarios que tenían el rol.
        if (previousName !== name) {
          for (const user of store.users) {
            user.roles = user.roles.map((roleName) => (roleName === previousName ? name : roleName));
          }
        }
        return json(role);
      }
    }

    if (path.endsWith('/admin/identity/users') && method === 'GET') {
      const status = url.searchParams.get('status');
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      let items = [...store.users];
      if (status !== null) items = items.filter((user) => String(user.active) === status);
      if (q.length > 0) {
        items = items.filter(
          (user) => user.email.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q),
        );
      }
      const size = Number(url.searchParams.get('size') ?? '100');
      return json({ items, page: 0, size, total: items.length });
    }

    if (path.endsWith('/admin/identity/users') && method === 'POST') {
      const email = String(body.email ?? '').trim();
      const password = String(body.password ?? '');
      const displayName = String(body.displayName ?? '').trim();
      if (!EMAIL.test(email) || displayName.length === 0 || password.length < 8 || password.length > 72) {
        return problem('Datos de usuario inválidos.', 400);
      }
      if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        return problem('El correo ya está registrado.', 409);
      }
      const user: UserAccount = {
        id: `user-${store.users.length + 1}`,
        email,
        displayName,
        active: body.active === true,
        roles: [],
      };
      store.users.push(user);
      return json(user, 201);
    }

    const statusMatch = path.match(/\/admin\/identity\/users\/([^/]+)\/status$/);
    if (statusMatch && method === 'POST') {
      const user = userById(decodeURIComponent(statusMatch[1] ?? ''));
      if (!user) return problem('El usuario no existe.', 404);
      user.active = body.active === true;
      return json(user);
    }

    const rolesMatch = path.match(/\/admin\/identity\/users\/([^/]+)\/roles$/);
    if (rolesMatch && method === 'PUT') {
      const user = userById(decodeURIComponent(rolesMatch[1] ?? ''));
      if (!user) return problem('El usuario no existe.', 404);
      const ids = Array.isArray(body.roles) ? body.roles.map(String) : [];
      const names: string[] = [];
      for (const id of ids) {
        const role = roleById(id);
        if (!role) return problem('Algún rol no existe.', 404);
        names.push(role.name);
      }
      user.roles = names;
      return json(user);
    }

    const userMatch = path.match(/\/admin\/identity\/users\/([^/]+)$/);
    if (userMatch) {
      const id = decodeURIComponent(userMatch[1] ?? '');
      const user = userById(id);
      if (!user) return problem('El usuario no existe.', 404);
      if (method === 'GET') return json(user);
      if (method === 'PUT') {
        const email = String(body.email ?? '').trim();
        const displayName = String(body.displayName ?? '').trim();
        if (!EMAIL.test(email) || displayName.length === 0) {
          return problem('Datos de usuario inválidos.', 400);
        }
        if (store.users.some((item) => item.id !== id && item.email.toLowerCase() === email.toLowerCase())) {
          return problem('El correo ya está en uso.', 409);
        }
        user.email = email;
        user.displayName = displayName;
        return json(user);
      }
    }

    return problem('No encontrado.', 404);
  };
}

/** Cliente de identidad respaldado por el fixture, con la misma interfaz que el real. */
export function createIdentityFixtureClient(
  store: IdentityFixture = createIdentityFixtureStore(),
): IdentityClient {
  return createIdentityClient({
    baseUrl: 'http://fixture.invalid/api/v1',
    token: 'fixture',
    fetchImpl: createIdentityFixtureFetch(store),
    timeoutMs: 1000,
  });
}

/**
 * El fixture sustituye al contrato solo en desarrollo y con activación explícita.
 * En producción siempre se consume la API real.
 */
export function fixtureEnabled(isDev: boolean, flag: string | undefined): boolean {
  return isDev && flag === 'true';
}
