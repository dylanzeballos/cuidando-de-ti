import { describe, expect, it } from 'vitest';
import { createAuthClient } from '@/lib/auth/auth-api';
import type { FetchLike } from '@/lib/site-client';

const BASE_URL = 'http://backend.test/api/v1';

const TOKENS = {
  accessToken: 'jwt-de-prueba',
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: 'refresh-opaco',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function capturingFetch(response: Response): { fetchImpl: FetchLike; calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({ url: String(input), init });
    return response;
  };
  return { fetchImpl, calls };
}

describe('createAuthClient.login', () => {
  it('devuelve ok con los tokens e incluye las credenciales en el cuerpo', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse(TOKENS));
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl });

    const result = await client.login('admin@acme.test', 'secreta');

    expect(result).toEqual({ status: 'ok', tokens: TOKENS });
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/auth/login');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(String(calls[0]?.init?.body)).toContain('admin@acme.test');
  });

  it('mapea 401 y 400 a invalid sin filtrar el motivo', async () => {
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl: capturingFetch(jsonResponse({ status: 401 }, 401)).fetchImpl });
    expect((await client.login('a@b.test', 'x')).status).toBe('invalid');

    const bad = createAuthClient({ baseUrl: BASE_URL, fetchImpl: capturingFetch(jsonResponse({}, 400)).fetchImpl });
    expect((await bad.login('a@b.test', 'x')).status).toBe('invalid');
  });

  it('mapea 5xx y fallos de red a unavailable', async () => {
    const server = createAuthClient({ baseUrl: BASE_URL, fetchImpl: capturingFetch(jsonResponse({}, 500)).fetchImpl });
    expect((await server.login('a@b.test', 'x')).status).toBe('unavailable');

    const down: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl: down });
    expect((await client.login('a@b.test', 'x')).status).toBe('unavailable');
  });

  it('trata una respuesta 200 sin tokens válidos como unavailable', async () => {
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl: capturingFetch(jsonResponse({ accessToken: '' })).fetchImpl });
    expect((await client.login('a@b.test', 'x')).status).toBe('unavailable');
  });
});

describe('createAuthClient.refresh y logout', () => {
  it('rota el token de refresco', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ ...TOKENS, refreshToken: 'nuevo' }));
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl });

    const result = await client.refresh('viejo');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.tokens.refreshToken).toBe('nuevo');
    expect(String(calls[0]?.init?.body)).toContain('viejo');
  });

  it('cierra sesión con 204 como ok', async () => {
    const { fetchImpl } = capturingFetch(new Response(null, { status: 204 }));
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl });
    expect(await client.logout('opaco')).toEqual({ status: 'ok' });
  });

  it('mapea el fallo de red del cierre a unavailable', async () => {
    const down: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createAuthClient({ baseUrl: BASE_URL, fetchImpl: down });
    expect((await client.logout('opaco')).status).toBe('unavailable');
  });
});
