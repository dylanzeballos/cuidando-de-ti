import { describe, expect, it } from 'vitest';
import { createCostsClient, latestCost, marginOf, type CostEntry } from '@/lib/admin/costs-api';
import type { FetchLike } from '@/lib/site-client';

const OPTIONS = {
  baseUrl: 'http://backend.test/api/v1',
  token: 'token-de-prueba',
  empresa: 'cuidando de ti',
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

describe('createCostsClient', () => {
  it('lista costos con el token de sesión, sin cabecera de empresa y con la empresa resuelta', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse([{ id: 'c1', productId: 'p1', branchId: 'b1', amount: 6 }]));
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    const result = await client.listCosts({ branchId: 'b1' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data[0]?.amount).toBe(6);
    expect(client.empresa).toBe('cuidando de ti');
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/costs?branchId=b1');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-de-prueba');
    // La empresa es implícita de la instalación: no se envía selección.
    expect(headers['x-tenant-slug']).toBeUndefined();
    expect(headers['x-empresa-slug']).toBeUndefined();
    expect(calls[0]?.url).not.toContain('la%20case');
  });

  it('registra un costo enviando el cuerpo JSON', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'c1', amount: 6 }, 201));
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    const result = await client.recordCost({ productId: 'p1', branchId: 'b1', amount: 6 });

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toContain('"productId":"p1"');
  });

  it('lista los gastos de un periodo con su total', async () => {
    const { fetchImpl, calls } = capturingFetch(
      jsonResponse({ period: '2026-10', currency: 'BOB', items: [{ id: 'e1', concept: 'Alquiler', amount: 800 }], total: 800 }),
    );
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    const result = await client.listExpenses({ period: '2026-10' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.total).toBe(800);
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/costs/expenses?period=2026-10');
  });

  it('registra un gasto enviando concepto, monto y periodo', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'e1', concept: 'Alquiler' }, 201));
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    const result = await client.createExpense({ concept: 'Alquiler', amount: 800, period: '2026-10' });

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toContain('"period":"2026-10"');
  });

  it('mapea 400 a validation con el mensaje del backend', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'monto negativo' }, 400));
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    expect(await client.recordCost({ productId: 'p1', branchId: 'b1', amount: -1 })).toEqual({
      status: 'validation',
      message: 'monto negativo',
    });
  });

  it('mapea 409 a conflict (vigencia solapada o periodo duplicado)', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'vigencia solapada' }, 409));
    const client = createCostsClient({ ...OPTIONS, fetchImpl });

    expect(await client.recordCost({ productId: 'p1', branchId: 'b1', amount: 1 })).toEqual({
      status: 'conflict',
      message: 'vigencia solapada',
    });
  });

  it('mapea 401/403 a unauthorized y 404 a notFound', async () => {
    const unauthorized = createCostsClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({ detail: 'No autorizado' }, 403)).fetchImpl,
    });
    expect(await unauthorized.listCosts()).toEqual({ status: 'unauthorized', message: 'No autorizado' });

    const missing = createCostsClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({ detail: 'Producto inexistente' }, 404)).fetchImpl,
    });
    expect(await missing.createExpense({ concept: 'X', amount: 1, period: '2026-10' })).toEqual({
      status: 'notFound',
      message: 'Producto inexistente',
    });
  });

  it('mapea 5xx y un fallo de red a unavailable sin lanzar', async () => {
    const serverError = createCostsClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({}, 500)).fetchImpl,
    });
    expect((await serverError.listCosts()).status).toBe('unavailable');

    const network: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createCostsClient({ ...OPTIONS, fetchImpl: network });
    expect((await client.listExpenses({ period: '2026-10' })).status).toBe('unavailable');
  });
});

const COSTS: CostEntry[] = [
  {
    id: 'c1',
    productId: 'p1',
    branchId: 'b1',
    amount: 6,
    currency: 'BOB',
    validFrom: '2026-01-01',
    validTo: null,
    createdBy: 'u1',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'c2',
    productId: 'p1',
    branchId: 'b1',
    amount: 6.5,
    currency: 'BOB',
    validFrom: '2026-09-01',
    validTo: null,
    createdBy: 'u1',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'c3',
    productId: 'p1',
    branchId: 'b2',
    amount: 9,
    currency: 'BOB',
    validFrom: '2026-09-15',
    validTo: null,
    createdBy: 'u1',
    createdAt: '2026-09-15T10:00:00Z',
  },
];

describe('latestCost', () => {
  it('elige el costo más reciente del producto en la sucursal', () => {
    expect(latestCost(COSTS, 'p1', 'b1')?.amount).toBe(6.5);
  });

  it('no cruza sucursales y devuelve null cuando no hay costo registrado', () => {
    expect(latestCost(COSTS, 'p1', 'b2')?.amount).toBe(9);
    expect(latestCost(COSTS, 'p2', 'b1')).toBeNull();
  });

  it('ante la misma vigencia elige el registrado más tarde', () => {
    const sameDate: CostEntry[] = [
      { ...COSTS[0]!, id: 'old', createdAt: '2026-01-01T09:00:00Z', amount: 5 },
      { ...COSTS[0]!, id: 'new', createdAt: '2026-01-01T11:00:00Z', amount: 7 },
    ];
    expect(latestCost(sameDate, 'p1', 'b1')?.id).toBe('new');
  });
});

describe('marginOf', () => {
  it('calcula el margen positivo y el cero', () => {
    expect(marginOf(8.5, 6)).toBe(2.5);
    expect(marginOf(8.5, 8.5)).toBe(0);
  });

  it('conserva un margen negativo sin ocultarlo', () => {
    expect(marginOf(8.5, 10)).toBe(-1.5);
  });

  it('devuelve null sin costo registrado, para no confundirlo con margen cero', () => {
    expect(marginOf(8.5, null)).toBeNull();
    expect(marginOf(8.5, undefined)).toBeNull();
  });
});
