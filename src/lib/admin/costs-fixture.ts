import {
  createCostsClient,
  type CostEntry,
  type CostsClient,
  type Expense,
} from '@/lib/admin/costs-api';
import type { FetchLike } from '@/lib/site-client';

/**
 * Fixture local con la forma del contrato `empresa-costs-v1` (productos con
 * precio, costos por sucursal y gastos operativos por periodo). Sirve para
 * desarrollar y probar sin el backend. La aplicación solo lo usa en desarrollo y
 * con activación explícita (`COSTS_FIXTURE=true`). Ver la decisión documentada
 * en `costs-service.ts` y el contrato en `docs/contracts/empresa-costs-v1.md`.
 */

export type CostsFixtureProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  /** Precio de venta del catálogo, solo para poblar la forma del fixture. */
  unitPrice: number;
};

export type CostsFixture = {
  products: CostsFixtureProduct[];
  costs: CostEntry[];
  expenses: Expense[];
};

const SAMPLE_PRODUCTS: CostsFixtureProduct[] = [
  { id: 'p-agua', sku: 'AGUA-2L', name: 'Agua 2L', unit: 'UNIT', unitPrice: 8.5 },
  { id: 'p-pan', sku: 'PAN-01', name: 'Pan', unit: 'UNIT', unitPrice: 3 },
];

/** Almacén del fixture. Cada cliente de fixture tiene su propio almacén. */
export function createCostsFixtureStore(
  products: CostsFixtureProduct[] = SAMPLE_PRODUCTS,
): CostsFixture {
  return { products: [...products], costs: [], expenses: [] };
}

function json(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function problem(detail: string, status: number): Response {
  return json({ type: 'about:blank', title: 'Error', status, detail, timestamp: 'fixture' }, status);
}

function readBody(init?: RequestInit): Record<string, unknown> {
  if (init?.body === undefined || init.body === null) return {};
  try {
    const parsed = JSON.parse(String(init.body)) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Periodo como mes calendario `YYYY-MM`. */
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * `FetchLike` que responde como el contrato de costos con estado en memoria.
 */
export function createCostsFixtureFetch(store: CostsFixture = createCostsFixtureStore()): FetchLike {
  const productById = (productId: string) => store.products.find((product) => product.id === productId);

  return async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = readBody(init);

    if (!path.startsWith('/api/v1/costs')) return problem('No encontrado.', 404);

    // --- Gastos operativos por periodo ---
    if (path === '/api/v1/costs/expenses' && method === 'GET') {
      const period = url.searchParams.get('period') ?? '';
      if (!PERIOD.test(period)) return problem('El periodo debe tener el formato YYYY-MM.', 400);
      const items = store.expenses.filter((expense) => expense.period === period);
      const total = round2(items.reduce((sum, expense) => sum + expense.amount, 0));
      return json({ period, currency: 'BOB', items, total });
    }

    if (path === '/api/v1/costs/expenses' && method === 'POST') {
      const concept = String(body.concept ?? '').trim();
      const amount = Number(body.amount);
      const period = String(body.period ?? '').trim();
      if (concept.length === 0 || !Number.isFinite(amount) || amount < 0 || !PERIOD.test(period)) {
        return problem('Concepto, monto o periodo inválidos.', 400);
      }
      if (store.expenses.some((expense) => expense.period === period && expense.concept.toLowerCase() === concept.toLowerCase())) {
        return problem('Ya existe un gasto con ese concepto en el periodo.', 409);
      }
      const expense: Expense = {
        id: `expense-${store.expenses.length + 1}`,
        concept,
        amount: round2(amount),
        period,
        createdBy: 'fixture-user',
        createdAt: new Date().toISOString(),
      };
      store.expenses.push(expense);
      return json(expense, 201);
    }

    // --- Costos por producto y sucursal ---
    if (path === '/api/v1/costs' && method === 'GET') {
      const branchId = url.searchParams.get('branchId');
      const productId = url.searchParams.get('productId');
      let items = [...store.costs];
      if (branchId) items = items.filter((cost) => cost.branchId === branchId);
      if (productId) items = items.filter((cost) => cost.productId === productId);
      return json(items);
    }

    if (path === '/api/v1/costs' && method === 'POST') {
      const productId = String(body.productId ?? '').trim();
      const branchId = String(body.branchId ?? '').trim();
      const amount = Number(body.amount);
      const validFrom =
        typeof body.validFrom === 'string' && body.validFrom.length > 0
          ? body.validFrom
          : new Date().toISOString().slice(0, 10);
      if (productId.length === 0 || branchId.length === 0 || !Number.isFinite(amount) || amount < 0) {
        return problem('Producto, sucursal o monto inválidos.', 400);
      }
      if (productById(productId) === undefined) return problem('El producto no existe.', 404);
      if (store.costs.some((cost) => cost.productId === productId && cost.branchId === branchId && cost.validFrom === validFrom)) {
        return problem('Ya hay un costo con esa vigencia para el producto y la sucursal.', 409);
      }
      const cost: CostEntry = {
        id: `cost-${store.costs.length + 1}`,
        productId,
        branchId,
        amount: round2(amount),
        currency: 'BOB',
        validFrom,
        validTo: null,
        createdBy: 'fixture-user',
        createdAt: new Date().toISOString(),
      };
      store.costs.push(cost);
      return json(cost, 201);
    }

    return problem('No encontrado.', 404);
  };
}

/** Cliente de costos respaldado por el fixture, con la misma interfaz que el real. */
export function createCostsFixtureClient(store: CostsFixture = createCostsFixtureStore()): CostsClient {
  return createCostsClient({
    baseUrl: 'http://fixture.invalid/api/v1',
    token: 'fixture',
    empresa: 'fixture',
    fetchImpl: createCostsFixtureFetch(store),
    timeoutMs: 1000,
  });
}

/**
 * El fixture sustituye al contrato solo en desarrollo y con activación explícita.
 * En producción siempre se consume la API real.
 */
export function costsFixtureEnabled(isDev: boolean, flag: string | undefined): boolean {
  return isDev && flag === 'true';
}
