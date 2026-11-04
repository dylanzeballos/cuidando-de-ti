import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor del contrato `empresa-auth-session-v1`
 * (ver ../plataforma-core-api/docs/contracts/empresa-auth-session-v1.md).
 * Nunca lanza: traduce las respuestas a `ok`/`invalid`/`unavailable`.
 */

export type AuthTokens = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
};

export type AuthResult =
  | { status: 'ok'; tokens: AuthTokens }
  | { status: 'invalid'; message: string }
  | { status: 'unavailable'; message: string };

export type AuthActionResult =
  | { status: 'ok' }
  | { status: 'invalid'; message: string }
  | { status: 'unavailable'; message: string };

export type AuthClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Inyectable para pruebas. Por defecto, el `fetch` global. */
  fetchImpl?: FetchLike;
  /** Tiempo máximo de espera por petición, en milisegundos. */
  timeoutMs?: number;
};

const INVALID_MESSAGE = 'Correo o contraseña incorrectos.';
const UNAVAILABLE_MESSAGE = 'El servicio de inicio de sesión no está disponible por ahora.';

function parseTokens(value: unknown): AuthTokens | null {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.accessToken !== 'string' || payload.accessToken.length === 0) return null;
  if (typeof payload.refreshToken !== 'string' || payload.refreshToken.length === 0) return null;
  if (typeof payload.tokenType !== 'string') return null;
  if (typeof payload.expiresIn !== 'number' || !Number.isFinite(payload.expiresIn)) return null;
  return {
    accessToken: payload.accessToken,
    tokenType: payload.tokenType,
    expiresIn: payload.expiresIn,
    refreshToken: payload.refreshToken,
  };
}

export function createAuthClient(options: AuthClientOptions) {
  const { baseUrl, fetchImpl = fetch, timeoutMs = 5000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function send(path: string, body: unknown): Promise<Response | 'unavailable'> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(`${base}${path}`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      return 'unavailable';
    } finally {
      clearTimeout(timer);
    }
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    const response = await send('/auth/login', { email, password });
    if (response === 'unavailable') return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    if (response.status === 401 || response.status === 400) {
      return { status: 'invalid', message: INVALID_MESSAGE };
    }
    if (!response.ok) return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
    const tokens = parseTokens(payload);
    return tokens === null
      ? { status: 'unavailable', message: UNAVAILABLE_MESSAGE }
      : { status: 'ok', tokens };
  }

  async function refresh(refreshToken: string): Promise<AuthResult> {
    const response = await send('/auth/refresh', { refreshToken });
    if (response === 'unavailable') return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    if (response.status === 401 || response.status === 400) {
      return { status: 'invalid', message: 'La sesión expiró.' };
    }
    if (!response.ok) return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
    const tokens = parseTokens(payload);
    return tokens === null
      ? { status: 'unavailable', message: UNAVAILABLE_MESSAGE }
      : { status: 'ok', tokens };
  }

  async function logout(refreshToken: string): Promise<AuthActionResult> {
    const response = await send('/auth/logout', { refreshToken });
    if (response === 'unavailable') return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    if (response.status === 400) return { status: 'invalid', message: 'Solicitud de cierre no válida.' };
    if (!response.ok) return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    return { status: 'ok' };
  }

  return { login, refresh, logout };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
