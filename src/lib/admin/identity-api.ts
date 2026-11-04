import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor del contrato `empresa-identity-admin-v1`
 * (ver ../plataforma-core-api/docs/contracts/empresa-identity-admin-v1.md).
 *
 * Administra usuarios, roles y permisos de la empresa de la instalación. La
 * empresa es implícita: nunca se envía identificador ni cabecera de selección.
 * Nunca lanza: traduce las respuestas a un resultado discriminado para que la
 * página elija el mensaje.
 */

export type UserAccount = {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  roles: string[];
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
};

export type Permission = {
  code: string;
  description: string;
};

export type PermissionGroup = {
  moduleCode: string;
  enabled: boolean;
  permissions: Permission[];
};

export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export type IdentityResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'notFound'; message: string }
  | { status: 'unavailable'; message: string };

export type ListUsersParams = {
  active?: boolean;
  query?: string;
  page?: number;
  size?: number;
};

export type CreateUserInput = {
  email: string;
  password: string;
  displayName: string;
  active?: boolean;
};

export type UpdateUserInput = {
  email: string;
  displayName: string;
};

export type SaveRoleInput = {
  name: string;
  description?: string | null;
  permissions: string[];
};

export type IdentityClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Token de acceso de la sesión. Solo se usa en el servidor; nunca se envía al navegador. */
  token: string;
  /** Inyectable para pruebas. Por defecto, el `fetch` global. */
  fetchImpl?: FetchLike;
  /** Tiempo máximo de espera por petición, en milisegundos. */
  timeoutMs?: number;
};

const UNAVAILABLE_MESSAGE = 'La administración de identidad no está disponible por ahora.';

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Cliente de servidor para la administración de identidad. Nunca lanza: traduce
 * las respuestas del backend a un resultado discriminado para la página.
 */
export function createIdentityClient(options: IdentityClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 5000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<IdentityResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthorized', message: await readMessage(response, 'No autorizado.') };
    }
    if (response.status === 400) {
      return { status: 'validation', message: await readMessage(response, 'Datos inválidos.') };
    }
    if (response.status === 404) {
      return { status: 'notFound', message: await readMessage(response, 'No encontrado.') };
    }
    if (response.status === 409) {
      return { status: 'conflict', message: await readMessage(response, 'Conflicto.') };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, UNAVAILABLE_MESSAGE) };
    }

    // `DELETE` responde `204` sin cuerpo.
    if (response.status === 204) {
      return { status: 'ok', data: undefined as T };
    }

    try {
      return { status: 'ok', data: (await response.json()) as T };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
  }

  function sendJson<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<IdentityResult<T>> {
    return request<T>(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return {
    listUsers: (params: ListUsersParams = {}) => {
      const search = new URLSearchParams();
      if (params.active !== undefined) search.set('status', String(params.active));
      if (params.query) search.set('q', params.query);
      if (params.page !== undefined) search.set('page', String(params.page));
      search.set('size', String(params.size ?? 100));
      return request<Page<UserAccount>>(`/admin/identity/users?${search.toString()}`);
    },
    getUser: (userId: string) =>
      request<UserAccount>(`/admin/identity/users/${encodeURIComponent(userId)}`),
    createUser: (input: CreateUserInput) =>
      sendJson<UserAccount>('POST', '/admin/identity/users', input),
    updateUser: (userId: string, input: UpdateUserInput) =>
      sendJson<UserAccount>('PUT', `/admin/identity/users/${encodeURIComponent(userId)}`, input),
    setUserStatus: (userId: string, active: boolean) =>
      sendJson<UserAccount>('POST', `/admin/identity/users/${encodeURIComponent(userId)}/status`, {
        active,
      }),
    setUserRoles: (userId: string, roles: string[]) =>
      sendJson<UserAccount>('PUT', `/admin/identity/users/${encodeURIComponent(userId)}/roles`, {
        roles,
      }),
    listRoles: () => request<Role[]>('/admin/identity/roles'),
    getRole: (roleId: string) => request<Role>(`/admin/identity/roles/${encodeURIComponent(roleId)}`),
    createRole: (input: SaveRoleInput) =>
      sendJson<Role>('POST', '/admin/identity/roles', input),
    updateRole: (roleId: string, input: SaveRoleInput) =>
      sendJson<Role>('PUT', `/admin/identity/roles/${encodeURIComponent(roleId)}`, input),
    deleteRole: (roleId: string) =>
      request<void>('/admin/identity/roles/' + encodeURIComponent(roleId), { method: 'DELETE' }),
    listPermissions: () => request<PermissionGroup[]>('/admin/identity/permissions'),
  };
}

export type IdentityClient = ReturnType<typeof createIdentityClient>;
