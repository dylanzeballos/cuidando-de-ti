import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor del contrato `empresa-costs-v1`
 * (ver docs/contracts/empresa-costs-v1.md; el contrato canónico lo publicará el
 * backend hermano). Mientras no exista, el desarrollo usa
 * `src/lib/admin/costs-fixture.ts`.
 *
 * Registra el costo de compra por producto y sucursal y los gastos operativos por
 * periodo de la empresa de la instalación. La empresa es implícita: nunca se
 * envía identificador ni cabecera de selección; se recibe ya resuelta en el
 * servidor desde la sesión. Nunca lanza: traduce las respuestas a un resultado
 * discriminado para que la página elija el mensaje.
 */

export type CostEntry = {
  id: string;
  productId: string;
  branchId: string;
  /** Monto no negativo en la moneda de la empresa. */
  amount: number;
  currency: string;
  /** Inicio de la vigencia del costo de compra. */
  validFrom: string;
  /** Fin de la vigencia; `null` si sigue vigente sin fecha de fin. */
  validTo: string | null;
  createdBy: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  concept: string;
  /** Monto no negativo en la moneda de la empresa. */
  amount: number;
  /** Periodo al que pertenece el gasto, con formato `YYYY-MM`. */
  period: string;
  createdBy: string;
  createdAt: string;
};

export type ExpenseSummary = {
  period: string;
  currency: string;
  items: Expense[];
  /** Total del periodo, dictado por el backend. */
  total: number;
};

export type CostsResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'notFound'; message: string }
  | { status: 'unavailable'; message: string };

export type ListCostsParams = {
  branchId?: string;
  productId?: string;
};

export type RecordCostInput = {
  productId: string;
  branchId: string;
  amount: number;
  validFrom?: string;
};

export type ListExpensesParams = {
  period: string;
};

export type CreateExpenseInput = {
  concept: string;
  amount: number;
  period: string;
};

export type CostsClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Token de acceso de la sesión. Solo se usa en el servidor; nunca se envía al navegador. */
  token: string;
  /**
   * Empresa de la instalación, resuelta en el servidor desde la sesión. Se expone
   * para trazabilidad; nunca se envía como cabecera ni como parámetro de selección.
   */
  empresa: string;
  /** Inyectable para pruebas. Por defecto, el `fetch` global. */
  fetchImpl?: FetchLike;
  /** Tiempo máximo de espera por petición, en milisegundos. */
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

/** Redondeo estable a dos decimales (moneda de la empresa). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Costo de compra más reciente de un producto en una sucursal: la entrada con
 * mayor `validFrom` y, ante un empate, la de mayor `createdAt`. Devuelve `null`
 * si no hay ningún costo registrado, para distinguir "sin costo" de "margen cero".
 */
export function latestCost(
  costs: readonly CostEntry[],
  productId: string,
  branchId: string,
): CostEntry | null {
  let latest: CostEntry | null = null;
  for (const cost of costs) {
    if (cost.productId !== productId || cost.branchId !== branchId) continue;
    if (latest === null) {
      latest = cost;
      continue;
    }
    if (cost.validFrom > latest.validFrom) latest = cost;
    else if (cost.validFrom === latest.validFrom && cost.createdAt > latest.createdAt) latest = cost;
  }
  return latest;
}

/**
 * Margen = precio de venta − costo de compra. Devuelve `null` cuando no hay costo
 * registrado o el monto no es válido, de modo que "sin costo" no se confunde con
 * un margen cero; un margen negativo se conserva tal cual.
 */
export function marginOf(salePrice: number, costAmount: number | null | undefined): number | null {
  if (costAmount === null || costAmount === undefined || !Number.isFinite(costAmount)) return null;
  if (!Number.isFinite(salePrice)) return null;
  return round2(salePrice - costAmount);
}

/**
 * Cliente de servidor para costos y gastos. Nunca lanza: traduce las respuestas
 * del backend a un resultado discriminado para la página.
 */
export function createCostsClient(options: CostsClientOptions) {
  const { baseUrl, token, empresa, fetchImpl = fetch, timeoutMs = 5000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<CostsResult<T>> {
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
    if (response.status === 404) {
      return { status: 'notFound', message: await readMessage(response, 'No encontrado.') };
    }
    if (response.status === 409) {
      return { status: 'conflict', message: await readMessage(response, 'Conflicto.') };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, UNAVAILABLE_MESSAGE) };
    }

    if (response.status === 204) {
      return { status: 'ok', data: undefined as T };
    }

    try {
      return { status: 'ok', data: (await response.json()) as T };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE_MESSAGE };
    }
  }

  function postJson<T>(path: string, body: unknown): Promise<CostsResult<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return {
    /**
     * Empresa de la instalación desde la que se resolvió este cliente. Es
     * informativa: el backend la deduce de la sesión y no se envía por petición.
     */
    empresa,
    listCosts: (params: ListCostsParams = {}) => {
      const search = new URLSearchParams();
      if (params.branchId) search.set('branchId', params.branchId);
      if (params.productId) search.set('productId', params.productId);
      const query = search.toString();
      return request<CostEntry[]>(`/costs${query ? `?${query}` : ''}`);
    },
    recordCost: (input: RecordCostInput) => postJson<CostEntry>('/costs', input),
    listExpenses: (params: ListExpensesParams) => {
      const search = new URLSearchParams({ period: params.period });
      return request<ExpenseSummary>(`/costs/expenses?${search.toString()}`);
    },
    createExpense: (input: CreateExpenseInput) => postJson<Expense>('/costs/expenses', input),
  };
}

export type CostsClient = ReturnType<typeof createCostsClient>;
