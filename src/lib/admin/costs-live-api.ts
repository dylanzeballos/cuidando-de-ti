import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor alineado con los endpoints reales de costos y gastos de
 * `plataforma-core-api` (`/costs/margins`, `/costs`, `/costs/expenses`). El
 * cliente histórico `costs-api.ts` responde a un contrato anterior; este es el
 * que usan las pantallas de administración.
 */

export type CostMargin = {
  branchId: string;
  productId: string;
  sku: string;
  name: string;
  costPrice: number;
  unitPrice: number;
  marginAmount: number;
  marginPercent: number | null;
};

export type ExpenseEntry = {
  id: string;
  branchId: string | null;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  subject: string;
  createdAt: string;
};

export type PageOf<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export type ExpensePage = PageOf<ExpenseEntry>;

export type ExpenseCategoryTotal = {
  category: string;
  total: number;
};

export type ExpenseTotals = {
  from: string;
  to: string;
  total: number;
  byCategory: ExpenseCategoryTotal[];
};

export type CostsLiveResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'unavailable'; message: string };

export type CreateCostInput = {
  branchId: string;
  productId: string;
  costPrice: number;
  validFrom: string;
  validTo?: string;
};

export type CreateExpenseInput = {
  branchId?: string | null;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
};

export type ExpenseFilter = {
  category?: string;
  branchId?: string;
};

export type CostsLiveClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const UNAVAILABLE_MESSAGE = 'La administración de costos no está disponible por ahora.';

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export function createCostsLiveClient(options: CostsLiveClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 7000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<CostsLiveResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthorized', message: await readMessage(response, 'No autorizado.') };
    }
    if (response.status === 400) {
      return { status: 'validation', message: await readMessage(response, 'Datos inválidos.') };
    }
    if (response.status === 409) {
      return { status: 'conflict', message: await readMessage(response, 'Conflicto.') };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, UNAVAILABLE_MESSAGE) };
    }

    try {
      return { status: 'ok', data: (await response.json()) as T };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
  }

  function sendJson<T>(path: string, method: string, body: unknown): Promise<CostsLiveResult<T>> {
    return request<T>(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function expenseQuery(
    from: string,
    to: string,
    filters: ExpenseFilter = {},
    paginated = true,
  ): string {
    const search = new URLSearchParams({ from, to });
    if (paginated) search.set('size', '100');
    if (filters.category) search.set('category', filters.category);
    if (filters.branchId) search.set('branchId', filters.branchId);
    return search.toString();
  }

  return {
    /** Márgenes vigentes; el backend solo devuelve productos con costo. */
    listMargins: (branchId: string) =>
      request<PageOf<CostMargin>>(
        `/costs/margins?branchId=${encodeURIComponent(branchId)}&size=100`,
      ),
    createCost: (input: CreateCostInput) => sendJson<unknown>('/costs', 'POST', input),
    listExpenses: (from: string, to: string, filters: ExpenseFilter = {}) =>
      request<ExpensePage>(`/costs/expenses?${expenseQuery(from, to, filters)}`),
    createExpense: (input: CreateExpenseInput) =>
      sendJson<ExpenseEntry>('/costs/expenses', 'POST', input),
    expenseTotals: (from: string, to: string, filters: ExpenseFilter = {}) =>
      request<ExpenseTotals>(`/costs/expenses/totals?${expenseQuery(from, to, filters, false)}`),
  };
}

export type CostsLiveClient = ReturnType<typeof createCostsLiveClient>;
