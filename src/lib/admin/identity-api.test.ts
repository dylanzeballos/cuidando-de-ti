import { describe, expect, it } from 'vitest';
import { createIdentityClient } from '@/lib/admin/identity-api';
import type { FetchLike } from '@/lib/site-client';

const OPTIONS = {
  baseUrl: 'http://backend.test/api/v1',
  token: 'token-de-prueba',
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

describe('createIdentityClient', () => {
  it('lista usuarios y envía el token de sesión sin cabecera de empresa', async () => {
    const { fetchImpl, calls } = capturingFetch(
      jsonResponse({
        items: [{ id: 'u1', email: 'ana@acme.test', displayName: 'Ana', active: true, roles: ['Vendedor'] }],
        page: 0,
        size: 100,
        total: 1,
      }),
    );
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.listUsers();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.total).toBe(1);
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/admin/identity/users?size=100');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-de-prueba');
    // La empresa es implícita de la instalación: no se envía cabecera de selección.
    expect(headers['x-tenant-slug']).toBeUndefined();
    expect(headers['x-empresa-slug']).toBeUndefined();
  });

  it('crea un usuario enviando el cuerpo JSON', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'u2' }, 201));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.createUser({
      email: 'ana@acme.test',
      password: 'secreta123',
      displayName: 'Ana',
    });

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/admin/identity/users');
    expect(String(calls[0]?.init?.body)).toContain('ana@acme.test');
  });

  it('cambia el estado con POST al endpoint de estado', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'u1', active: false }));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.setUserStatus('u1', false);

    expect(result.status).toBe('ok');
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/admin/identity/users/u1/status');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(String(calls[0]?.init?.body)).toContain('false');
  });

  it('reemplaza los roles con PUT al endpoint de roles', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'u1', roles: ['Vendedor'] }));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.setUserRoles('u1', ['r1', 'r2']);

    expect(result.status).toBe('ok');
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/admin/identity/users/u1/roles');
    expect(calls[0]?.init?.method).toBe('PUT');
    expect(String(calls[0]?.init?.body)).toContain('r1');
  });

  it('elimina un rol y trata el 204 sin cuerpo como ok', async () => {
    const { fetchImpl, calls } = capturingFetch(new Response(null, { status: 204 }));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.deleteRole('r1');

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('DELETE');
  });

  it('lista los permisos agrupados por módulo', async () => {
    const { fetchImpl } = capturingFetch(
      jsonResponse([
        { moduleCode: 'identity', enabled: true, permissions: [{ code: 'identity.manage', description: '…' }] },
      ]),
    );
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.listPermissions();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data[0]?.moduleCode).toBe('identity');
  });

  it('mapea 400 a validation con el mensaje del backend', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'contraseña inválida' }, 400));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.createUser({ email: 'a@b.test', password: 'x', displayName: 'A' });

    expect(result).toEqual({ status: 'validation', message: 'contraseña inválida' });
  });

  it('mapea 409 a conflict', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'correo ya registrado' }, 409));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    const result = await client.createUser({ email: 'a@b.test', password: 'x', displayName: 'A' });

    expect(result).toEqual({ status: 'conflict', message: 'correo ya registrado' });
  });

  it('mapea 401/403 a unauthorized', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'Sin permiso' }, 403));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    expect(await client.listRoles()).toEqual({ status: 'unauthorized', message: 'Sin permiso' });
  });

  it('mapea 404 a notFound', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'No existe' }, 404));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    expect(await client.getUser('u9')).toEqual({ status: 'notFound', message: 'No existe' });
  });

  it('mapea 5xx a unavailable', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({}, 500));
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    expect((await client.listRoles()).status).toBe('unavailable');
  });

  it('mapea un fallo de red a unavailable', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createIdentityClient({ ...OPTIONS, fetchImpl });

    expect((await client.listUsers()).status).toBe('unavailable');
  });
});
