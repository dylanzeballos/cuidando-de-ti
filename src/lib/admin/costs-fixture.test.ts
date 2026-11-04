import { describe, expect, it } from 'vitest';
import { costsFixtureEnabled, createCostsFixtureClient, createCostsFixtureStore } from '@/lib/admin/costs-fixture';

describe('createCostsFixtureClient', () => {
  it('registra un costo y lo devuelve en el listado de la sucursal', async () => {
    const client = createCostsFixtureClient();

    const created = await client.recordCost({
      productId: 'p-agua',
      branchId: 'b-centro',
      amount: 6,
      validFrom: '2026-10-01',
    });
    expect(created.status).toBe('ok');

    const listed = await client.listCosts({ branchId: 'b-centro' });
    expect(listed.status).toBe('ok');
    if (listed.status === 'ok') {
      expect(listed.data).toHaveLength(1);
      expect(listed.data[0]?.amount).toBe(6);
      expect(listed.data[0]?.currency).toBe('BOB');
    }

    // Otra sucursal no ve el costo registrado.
    const otherBranch = await client.listCosts({ branchId: 'b-norte' });
    if (otherBranch.status === 'ok') expect(otherBranch.data).toHaveLength(0);
  });

  it('rechaza un monto negativo (validation) y un producto inexistente (notFound)', async () => {
    const client = createCostsFixtureClient();

    expect((await client.recordCost({ productId: 'p-agua', branchId: 'b1', amount: -1 })).status).toBe('validation');
    expect((await client.recordCost({ productId: 'p-nope', branchId: 'b1', amount: 1 })).status).toBe('notFound');
  });

  it('rechaza una vigencia solapada para el mismo producto y sucursal (conflict)', async () => {
    const client = createCostsFixtureClient();

    await client.recordCost({ productId: 'p-agua', branchId: 'b1', amount: 6, validFrom: '2026-10-01' });
    const duplicated = await client.recordCost({
      productId: 'p-agua',
      branchId: 'b1',
      amount: 7,
      validFrom: '2026-10-01',
    });

    expect(duplicated.status).toBe('conflict');
  });

  it('registra gastos y totaliza el periodo consultado', async () => {
    const client = createCostsFixtureClient();

    const first = await client.createExpense({ concept: 'Alquiler', amount: 800, period: '2026-10' });
    expect(first.status).toBe('ok');
    await client.createExpense({ concept: 'Luz', amount: 150.5, period: '2026-10' });

    const summary = await client.listExpenses({ period: '2026-10' });
    expect(summary.status).toBe('ok');
    if (summary.status === 'ok') {
      expect(summary.data.items).toHaveLength(2);
      expect(summary.data.total).toBe(950.5);
    }
  });

  it('un periodo sin gastos devuelve total cero y ninguna lista', async () => {
    const client = createCostsFixtureClient();

    const summary = await client.listExpenses({ period: '2026-11' });

    expect(summary.status).toBe('ok');
    if (summary.status === 'ok') {
      expect(summary.data.items).toHaveLength(0);
      expect(summary.data.total).toBe(0);
    }
  });

  it('rechaza un gasto duplicado (conflict) y un periodo inválido (validation)', async () => {
    const client = createCostsFixtureClient();

    await client.createExpense({ concept: 'Alquiler', amount: 800, period: '2026-10' });
    expect((await client.createExpense({ concept: 'alquiler', amount: 900, period: '2026-10' })).status).toBe('conflict');

    const badPeriod = await client.listExpenses({ period: '2026-13' });
    expect(badPeriod.status).toBe('validation');
  });

  it('parte de un almacén inyectable por prueba', async () => {
    const store = createCostsFixtureStore([]);
    const client = createCostsFixtureClient(store);

    expect((await client.listCosts()).status).toBe('ok');
    expect(store.costs).toHaveLength(0);
  });
});

describe('costsFixtureEnabled', () => {
  it('solo se activa en desarrollo con la bandera explícita', () => {
    expect(costsFixtureEnabled(true, 'true')).toBe(true);
    expect(costsFixtureEnabled(false, 'true')).toBe(false);
    expect(costsFixtureEnabled(true, undefined)).toBe(false);
    expect(costsFixtureEnabled(true, 'false')).toBe(false);
  });
});
