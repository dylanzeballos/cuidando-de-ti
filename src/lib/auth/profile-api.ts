import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor del perfil propio (`GET /api/v1/identity/me`). Devuelve
 * los roles y permisos efectivos de la cuenta autenticada para que el panel
 * pueda ocultar las secciones que el backend rechazaría. Nunca lanza.
 */

export type AccessProfile = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

export type ProfileResult =
  | { status: 'ok'; profile: AccessProfile }
  | { status: 'unauthorized'; message: string }
  | { status: 'unavailable'; message: string };

export type ProfileClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const UNAVAILABLE_MESSAGE = 'El perfil de la cuenta no está disponible por ahora.';

function parsePermissionList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length === 0) return null;
    if (!result.includes(entry)) result.push(entry);
  }
  return result;
}

function parseProfile(value: unknown): AccessProfile | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.id !== 'string' || payload.id.length === 0) return null;
  if (typeof payload.email !== 'string' || payload.email.length === 0) return null;
  if (typeof payload.displayName !== 'string') return null;
  const roles = parsePermissionList(payload.roles);
  const permissions = parsePermissionList(payload.permissions);
  if (roles === null || permissions === null) return null;
  return {
    id: payload.id,
    email: payload.email,
    displayName: payload.displayName,
    roles,
    permissions,
  };
}

export function createProfileClient(options: ProfileClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 5000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function getProfile(): Promise<ProfileResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(`${base}/identity/me`, {
        headers: { accept: 'application/json', authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401) {
      return { status: 'unauthorized', message: 'La sesión expiró.' };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }

    try {
      const profile = parseProfile(await response.json());
      return profile === null
        ? { status: 'unavailable', message: UNAVAILABLE_MESSAGE }
        : { status: 'ok', profile };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
  }

  return { getProfile };
}

export type ProfileClient = ReturnType<typeof createProfileClient>;
