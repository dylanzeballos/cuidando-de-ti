import type { FetchLike } from '@/lib/site-client';

/**
 * Cliente de servidor del contrato `empresa-sales-v1`
 * (ver ../plataforma-core-api/docs/contracts/empresa-sales-v1.md).
 *
 * Opera el registro de ventas y la caja de la empresa de la instalación. La empresa
 * es implícita: nunca se envía identificador ni cabecera de selección. Nunca
 * lanza: traduce las respuestas a un resultado discriminado para que la página
 * elija el mensaje.
 */

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'QR';

export type CashSessionStatus = 'OPEN' | 'CLOSED';

export type SaleStatus = 'COMPLETED' | 'ANNULLED';

export type CashSession = {
  id: string;
  branchId: string;
  openedBy: string;
  initialAmount: number;
  status: CashSessionStatus;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  expectedAmount: number | null;
  countedAmount: number | null;
  difference: number | null;
  saleCount: number;
  totalsByPaymentMethod: Record<string, number>;
};

export type SaleItem = {
  id: string;
  lineNumber: number;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

export type Sale = {
  id: string;
  number: number;
  branchId: string;
  cashSessionId: string;
  status: SaleStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  createdBy: string;
  createdAt: string;
  annulledAt: string | null;
  annulledBy: string | null;
  annulReason: string | null;
  items: SaleItem[];
  payments: SalePayment[];
};

export type SaleReturnItem = {
  id: string;
  saleItemId: string;
  quantity: number;
  amount: number;
};

export type SaleReturn = {
  id: string;
  saleId: string;
  total: number;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  items: SaleReturnItem[];
};

export type Receipt = {
  empresaId: string;
  empresaSlug: string;
  number: number;
  status: SaleStatus;
  createdAt: string;
  branchId: string;
  cashSessionId: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  items: SaleItem[];
  payments: SalePayment[];
  annulledAt: string | null;
  annulReason: string | null;
};

export type SalesPage<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export type SalesResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'notFound'; message: string }
  | { status: 'unavailable'; message: string };

export type OpenCashSessionInput = {
  branchId: string;
  initialAmount: number;
};

export type ListCashSessionsParams = {
  status?: CashSessionStatus;
  branchId?: string;
};

export type CreateSaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
};

export type CreateSalePaymentInput = {
  method: PaymentMethod;
  amount: number;
};

export type CreateSaleInput = {
  branchId: string;
  items: CreateSaleItemInput[];
  discount?: number;
  payments: CreateSalePaymentInput[];
};

export type ListSalesParams = {
  from?: string;
  to?: string;
  branchId?: string;
  cashSessionId?: string;
  status?: SaleStatus;
  page?: number;
  size?: number;
};

export type CreateReturnInput = {
  items: { saleItemId: string; quantity: number }[];
  reason?: string | null;
};

export type SalesClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Token de acceso de la sesión. Solo se usa en el servidor; nunca se envía al navegador. */
  token: string;
  /** Inyectable para pruebas. Por defecto, el `fetch` global. */
  fetchImpl?: FetchLike;
  /** Tiempo máximo de espera por petición, en milisegundos. */
  timeoutMs?: number;
};

const UNAVAILABLE_MESSAGE = 'El registro de venta no está disponible por ahora.';

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Cliente de servidor para ventas y caja. Nunca lanza: traduce las respuestas
 * del backend a un resultado discriminado para que la página elija el mensaje.
 */
export function createSalesClient(options: SalesClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 5000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<SalesResult<T>> {
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

  function postJson<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<SalesResult<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  return {
    openCashSession: (input: OpenCashSessionInput) =>
      postJson<CashSession>('/sales/cash-sessions', input),
    listCashSessions: (params: ListCashSessionsParams = {}) => {
      const search = new URLSearchParams();
      if (params.status) search.set('status', params.status);
      if (params.branchId) search.set('branchId', params.branchId);
      const query = search.toString();
      return request<CashSession[]>(`/sales/cash-sessions${query ? `?${query}` : ''}`);
    },
    getCashSession: (sessionId: string) =>
      request<CashSession>(`/sales/cash-sessions/${encodeURIComponent(sessionId)}`),
    closeCashSession: (sessionId: string, countedAmount: number) =>
      postJson<CashSession>(`/sales/cash-sessions/${encodeURIComponent(sessionId)}/close`, {
        countedAmount,
      }),
    createSale: (input: CreateSaleInput, idempotencyKey: string) =>
      postJson<Sale>('/sales', input, { 'Idempotency-Key': idempotencyKey }),
    listSales: (params: ListSalesParams = {}) => {
      const search = new URLSearchParams();
      if (params.from) search.set('from', params.from);
      if (params.to) search.set('to', params.to);
      if (params.branchId) search.set('branchId', params.branchId);
      if (params.cashSessionId) search.set('cashSessionId', params.cashSessionId);
      if (params.status) search.set('status', params.status);
      if (params.page !== undefined) search.set('page', String(params.page));
      search.set('size', String(params.size ?? 50));
      return request<SalesPage<Sale>>(`/sales?${search.toString()}`);
    },
    getSale: (saleId: string) => request<Sale>(`/sales/${encodeURIComponent(saleId)}`),
    getReceipt: (saleId: string) => request<Receipt>(`/sales/${encodeURIComponent(saleId)}/receipt`),
    annulSale: (saleId: string, reason?: string | null) =>
      postJson<Sale>(`/sales/${encodeURIComponent(saleId)}/annul`, { reason: reason ?? null }),
    listReturns: (saleId: string) =>
      request<SaleReturn[]>(`/sales/${encodeURIComponent(saleId)}/returns`),
    createReturn: (saleId: string, input: CreateReturnInput) =>
      postJson<SaleReturn>(`/sales/${encodeURIComponent(saleId)}/returns`, input),
  };
}

export type SalesClient = ReturnType<typeof createSalesClient>;
