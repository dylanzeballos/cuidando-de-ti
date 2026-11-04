import { describe, expect, it } from 'vitest';
import { createSalesClient } from '@/lib/sales/sales-api';
import { createSalesFixtureClient, createSalesFixtureStore } from '@/lib/sales/fixtures';
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

describe('createSalesClient', () => {
  it('abre un turno de caja con el token de sesión y sin cabecera de empresa', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 's1', status: 'OPEN' }, 201));
    const client = createSalesClient({ ...OPTIONS, fetchImpl });

    const result = await client.openCashSession({ branchId: 'b1', initialAmount: 200 });

    expect(result.status).toBe('ok');
    expect(calls[0]?.url).toBe('http://backend.test/api/v1/sales/cash-sessions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-de-prueba');
    expect(headers['x-tenant-slug']).toBeUndefined();
    expect(headers['x-empresa-slug']).toBeUndefined();
  });

  it('envía la clave de idempotencia al registrar la venta', async () => {
    const { fetchImpl, calls } = capturingFetch(jsonResponse({ id: 'sale-1', number: 1 }, 201));
    const client = createSalesClient({ ...OPTIONS, fetchImpl });

    const result = await client.createSale(
      {
        branchId: 'b1',
        items: [{ productId: 'p1', quantity: 2, unitPrice: 8.5 }],
        payments: [{ method: 'CASH', amount: 17 }],
      },
      'caja-1-0001',
    );

    expect(result.status).toBe('ok');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toContain('"branchId":"b1"');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('caja-1-0001');
  });

  it('mapea 400 a validation con el mensaje del backend', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'venta sin ítems' }, 400));
    const client = createSalesClient({ ...OPTIONS, fetchImpl });

    expect(
      await client.createSale({ branchId: 'b1', items: [], payments: [] }, 'k'),
    ).toEqual({ status: 'validation', message: 'venta sin ítems' });
  });

  it('mapea 409 a conflict (stock insuficiente)', async () => {
    const { fetchImpl } = capturingFetch(jsonResponse({ detail: 'stock insuficiente' }, 409));
    const client = createSalesClient({ ...OPTIONS, fetchImpl });

    expect(
      await client.createSale(
        { branchId: 'b1', items: [{ productId: 'p1', quantity: 9, unitPrice: 1 }], payments: [{ method: 'CASH', amount: 9 }] },
        'k',
      ),
    ).toEqual({ status: 'conflict', message: 'stock insuficiente' });
  });

  it('mapea 401/403 a unauthorized y 404 a notFound', async () => {
    const unauthorized = createSalesClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({ detail: 'No autorizado' }, 403)).fetchImpl,
    });
    expect(await unauthorized.listSales()).toEqual({ status: 'unauthorized', message: 'No autorizado' });

    const missing = createSalesClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({ detail: 'No existe' }, 404)).fetchImpl,
    });
    expect(await missing.getSale('x')).toEqual({ status: 'notFound', message: 'No existe' });
  });

  it('mapea 5xx y fallos de red a unavailable sin lanzar', async () => {
    const serverError = createSalesClient({
      ...OPTIONS,
      fetchImpl: capturingFetch(jsonResponse({}, 500)).fetchImpl,
    });
    expect((await serverError.listCashSessions()).status).toBe('unavailable');

    const network: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const client = createSalesClient({ ...OPTIONS, fetchImpl: network });
    expect((await client.listSales()).status).toBe('unavailable');
  });
});

describe('cliente de ventas contra el fixture', () => {
  it('ejecuta el ciclo caja → venta → ticket → devolución → anulación', async () => {
    const store = createSalesFixtureStore([
      { id: 'p1', sku: 'AGUA-2L', name: 'Agua 2L', unit: 'UNIT' },
    ]);
    const client = createSalesFixtureClient(store);

    const open = await client.openCashSession({ branchId: 'b1', initialAmount: 200 });
    expect(open.status).toBe('ok');
    if (open.status !== 'ok') return;
    expect(open.data.status).toBe('OPEN');

    const created = await client.createSale(
      {
        branchId: 'b1',
        items: [{ productId: 'p1', quantity: 2, unitPrice: 8.5 }],
        payments: [{ method: 'CASH', amount: 17 }],
      },
      'caja-1-0001',
    );
    expect(created.status).toBe('ok');
    if (created.status !== 'ok') return;
    expect(created.data.total).toBe(17);
    expect(created.data.items[0]?.sku).toBe('AGUA-2L');

    // Reintento con la misma clave: devuelve la venta ya registrada.
    const retried = await client.createSale(
      {
        branchId: 'b1',
        items: [{ productId: 'p1', quantity: 2, unitPrice: 8.5 }],
        payments: [{ method: 'CASH', amount: 17 }],
      },
      'caja-1-0001',
    );
    expect(retried.status).toBe('ok');
    if (retried.status === 'ok') expect(retried.data.id).toBe(created.data.id);
    expect(store.sales).toHaveLength(1);

    const list = await client.listSales();
    expect(list.status).toBe('ok');
    if (list.status === 'ok') expect(list.data.total).toBe(1);

    const receipt = await client.getReceipt(created.data.id);
    expect(receipt.status).toBe('ok');
    if (receipt.status === 'ok') expect(receipt.data.total).toBe(17);

    const lineId = created.data.items[0]?.id ?? '';
    const returned = await client.createReturn(created.data.id, {
      items: [{ saleItemId: lineId, quantity: 1 }],
      reason: 'producto dañado',
    });
    expect(returned.status).toBe('ok');
    if (returned.status === 'ok') expect(returned.data.total).toBe(8.5);

    // Devolver más de lo vendido se bloquea sin reintegrar.
    const over = await client.createReturn(created.data.id, {
      items: [{ saleItemId: lineId, quantity: 5 }],
    });
    expect(over.status).toBe('validation');

    const closed = await client.closeCashSession(open.data.id, 217);
    expect(closed.status).toBe('ok');
    if (closed.status === 'ok') {
      expect(closed.data.status).toBe('CLOSED');
      expect(closed.data.expectedAmount).toBe(217);
      expect(closed.data.saleCount).toBe(1);
    }

    const annulled = await client.annulSale(created.data.id);
    expect(annulled.status).toBe('ok');
    if (annulled.status === 'ok') expect(annulled.data.status).toBe('ANNULLED');

    const annulledAgain = await client.annulSale(created.data.id);
    expect(annulledAgain.status).toBe('conflict');
  });

  it('impide vender sin turno abierto', async () => {
    const client = createSalesFixtureClient();
    const result = await client.createSale(
      {
        branchId: 'sin-turno',
        items: [{ productId: 'p1', quantity: 1, unitPrice: 1 }],
        payments: [{ method: 'CASH', amount: 1 }],
      },
      'k',
    );
    expect(result.status).toBe('conflict');
  });
});
