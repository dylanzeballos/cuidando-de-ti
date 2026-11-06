import type { FetchLike } from '@/lib/site-client';
import type {
  BillingDocument,
  BillingDocumentSummary,
  BillingPage,
  BillingResult,
  BillingSummary,
  ListBillingParams,
} from '@/lib/billing/billing-types';

/**
 * Cliente de servidor del contrato fiscal `empresa-billing-v1`.
 * La empresa es impl�cita de la instalaci�n; el token solo vive en el servidor.
 * Nunca lanza: traduce las respuestas a un resultado discriminado.
 */

export type BillingClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const UNAVAILABLE = 'La facturaci�n no est� disponible por ahora.';

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export function createBillingClient(options: BillingClientOptions) {
  const { baseUrl, token, fetchImpl = fetch, timeoutMs = 6000 } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<BillingResult<T>> {
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
      return { status: 'unavailable', message: UNAVAILABLE };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthorized', message: await readMessage(response, 'No autorizado.') };
    }
    if (response.status === 400) {
      return { status: 'validation', message: await readMessage(response, 'Datos inv�lidos.') };
    }
    if (response.status === 404) {
      return { status: 'notFound', message: await readMessage(response, 'No encontrado.') };
    }
    if (response.status === 409) {
      return { status: 'conflict', message: await readMessage(response, 'Conflicto.') };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, UNAVAILABLE) };
    }
    try {
      return { status: 'ok', data: (await response.json()) as T };
    } catch {
      return { status: 'unavailable', message: UNAVAILABLE };
    }
  }

  function postJson<T>(path: string, body?: unknown): Promise<BillingResult<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  return {
    list: (params: ListBillingParams = {}) => {
      const search = new URLSearchParams();
      if (params.status) search.set('status', params.status);
      if (params.q) search.set('q', params.q);
      if (params.from) search.set('from', params.from);
      if (params.to) search.set('to', params.to);
      if (params.page !== undefined) search.set('page', String(params.page));
      search.set('size', String(params.size ?? 25));
      return request<BillingPage<BillingDocumentSummary>>(`/billing/documents?${search.toString()}`);
    },
    summary: () => request<BillingSummary>('/billing/documents/summary'),
    get: (documentId: string) =>
      request<BillingDocument>(`/billing/documents/${encodeURIComponent(documentId)}`),
    submit: (documentId: string) =>
      postJson<BillingDocument>(`/billing/documents/${encodeURIComponent(documentId)}/submit`),
    cancel: (documentId: string, reason: string) =>
      postJson<BillingDocument>(`/billing/documents/${encodeURIComponent(documentId)}/cancel`, {
        reason,
      }),
  };
}

export type BillingClient = ReturnType<typeof createBillingClient>;
