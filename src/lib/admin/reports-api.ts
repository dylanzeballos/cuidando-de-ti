import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor para las lecturas que alimentan el panel de reportes.
 * Se alinea con los endpoints reales de `plataforma-core-api`
 * (`/api/v1/costs/margins` y `/api/v1/costs/expenses/totals`), que difieren del
 * cliente de costos histórico. Nunca lanza: devuelve un resultado discriminado.
 */

export type MarginEntry = {
  branchId: string;
  productId: string;
  sku: string;
  name: string;
  costPrice: number;
  unitPrice: number;
  marginAmount: number;
  marginPercent: number | null;
};

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

export type ReportsPage<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export type ReportsResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'unauthorized'; message: string }
  | { status: 'unavailable'; message: string };

export type ReportsClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const UNAVAILABLE_MESSAGE = 'Los reportes no están disponibles por ahora.';

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export function createReportsClient(options: ReportsClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 7000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string): Promise<ReportsResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        headers: { accept: 'application/json', authorization: `Bearer ${token}` },
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
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, UNAVAILABLE_MESSAGE) };
    }

    try {
      return { status: 'ok', data: (await response.json()) as T };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
  }

  return {
    /** Márgenes vigentes de una sucursal; solo incluye productos con costo. */
    listMargins: (branchId: string) =>
      request<ReportsPage<MarginEntry>>(
        `/costs/margins?branchId=${encodeURIComponent(branchId)}&size=100`,
      ),
    /** Totales de gastos entre dos fechas ISO (YYYY-MM-DD). */
    expenseTotals: (from: string, to: string) =>
      request<ExpenseTotals>(
        `/costs/expenses/totals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  };
}

export type ReportsClient = ReturnType<typeof createReportsClient>;
