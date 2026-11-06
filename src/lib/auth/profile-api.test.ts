import { describe, expect, it } from 'vitest';
import { createProfileClient } from '@/lib/auth/profile-api';
import type { FetchLike } from '@/lib/site-client';

const BASE_URL = 'http://backend.test/api/v1';

const PROFILE = {
  id: 'cuenta-1',
  email: 'ventas@acme.test',
  displayName: 'Ventas',
  roles: ['Vendedor'],
  permissions: ['sales.manage'],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function capturingFetch(response: Response): {
  fetchImpl: FetchLike;
  calls: { url: string; init?: RequestInit }[];
} {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({ url: String(input), init });
    return response;
  };
  return { fetchImpl, calls };
}

describe('createProfileClient', () => {
  it('lee el perfil propio con el token de la sesión', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse(PROFILE));
    const client = createProfileClient({ baseUrl: BASE_URL, token: 'jwt', fetchImpl });

    const result = await client.getProfile();

    expect(result).toEqual({ status: 'ok', profile: PROFILE });
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/identity/me');
    expect(calls[0]?.init?.headers).toMatchObject({ authorization: 'Bearer jwt' });
  });

  it('marca la sesión como expirada ante 401', async () => {
    const client = createProfileClient({
      baseUrl: BASE_URL,
      token: 'jwt',
      fetchImpl: capturingFetch(jsonResponse({}, 401)).fetchImpl,
    });

    expect((await client.getProfile()).status).toBe('unauthorized');
  });

  it('trata 5xx, cuerpos inválidos y fallos de red como unavailable', async () => {
    const server = createProfileClient({
      baseUrl: BASE_URL,
      token: 'jwt',
      fetchImpl: capturingFetch(jsonResponse({}, 500)).fetchImpl,
    });
    expect((await server.getProfile()).status).toBe('unavailable');

    const invalid = createProfileClient({
      baseUrl: BASE_URL,
      token: 'jwt',
      fetchImpl: capturingFetch(jsonResponse({ permissions: 'no' })).fetchImpl,
    });
    expect((await invalid.getProfile()).status).toBe('unavailable');

    const down: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const offline = createProfileClient({ baseUrl: BASE_URL, token: 'jwt', fetchImpl: down });
    expect((await offline.getProfile()).status).toBe('unavailable');
  });
});
