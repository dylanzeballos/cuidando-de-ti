import { describe, expect, it } from 'vitest';
import { createAdminClient } from '@/lib/admin/catalog-api';
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

describe('createAdminClient', () => {
  it('lista productos y envía el token de sesión sin cabecera de empresa', async () => {
    const { fetchImpl, calls } = capturingFetch(
      jsonResponse({ items: [{ id: 'p1', sku: 'AGUA' }], page: 0, size: 100, total: 1 }),
    );
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    const result = await client.listProducts();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.total).toBe(1);
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/catalog/products?size=100');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-de-prueba');
    // La empresa es implícita de la instalación: no se envía cabecera de selección.
    expect(headers['x-tenant-slug']).toBeUndefined();
    expect(headers['x-empresa-slug']).toBeUndefined();
  });

  it('crea un producto enviando el cuerpo JSON', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'p1' }, 201));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    const result = await client.createProduct({
      sku: 'AGUA-2L',
      name: 'Agua 2L',
      unit: 'UNIT',
      unitPrice: 8.5,
      taxRate: 13,
    });

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toContain('AGUA-2L');
  });

  it('mapea 400 a validation con el mensaje del backend', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'precio inválido' }, 400));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    const result = await client.createProduct({
      sku: 'X', name: 'X', unit: 'UNIT', unitPrice: -1, taxRate: 0,
    });

    expect(result).toEqual({ status: 'validation', message: 'precio inválido' });
  });

  it('mapea 409 a conflict', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'SKU duplicado' }, 409));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    const result = await client.createProduct({
      sku: 'X', name: 'X', unit: 'UNIT', unitPrice: 1, taxRate: 0,
    });

    expect(result).toEqual({ status: 'conflict', message: 'SKU duplicado' });
  });

  it('mapea 401/403 a unauthorized', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'No autorizado' }, 403));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    expect(await client.listCategories()).toEqual({ status: 'unauthorized', message: 'No autorizado' });
  });

  it('mapea 404 a notFound', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'No existe' }, 404));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    expect(await client.getStock('b1', 'p1')).toEqual({ status: 'notFound', message: 'No existe' });
  });

  it('mapea 5xx a unavailable', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({}, 500));
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    expect((await client.listBranches()).status).toBe('unavailable');
  });

  it('mapea un fallo de red a unavailable', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createAdminClient({ ...OPTIONS, fetchImpl });

    expect((await client.listProducts()).status).toBe('unavailable');
  });
});
