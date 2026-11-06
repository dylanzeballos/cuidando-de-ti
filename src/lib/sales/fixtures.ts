import {
  createSalesClient,
  type CashSession,
  type PaymentMethod,
  type Sale,
  type SaleItem,
  type SaleReturn,
  type SalesClient,
} from '@/lib/sales/sales-api';
import { round2 } from '@/lib/sales/cart';
import type { FetchLike } from '@/lib/site-client';

/**
 * Fixture local con la forma del contrato `empresa-sales-v1` (turnos, ventas,
 * pagos, anulación, devoluciones y ticket). Sirve para desarrollar y probar sin
 * el backend. La aplicación solo lo usa en desarrollo y con activación explícita
 * (`SALES_FIXTURE=true`). Ver la decisión documentada en `sales-service.ts`.
 */

export type SalesFixtureProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
};

export type SalesFixture = {
  cashSessions: CashSession[];
  sales: Sale[];
  returns: SaleReturn[];
  /** Productos del catálogo para enriquecer las líneas del fixture (opcional). */
  products: SalesFixtureProduct[];
};

/** Almacén del fixture. Por defecto vacío: el historial arranca sin ventas. */
export function createSalesFixtureStore(products: SalesFixtureProduct[] = []): SalesFixture {
  return { cashSessions: [], sales: [], returns: [], products };
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

function readHeader(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers;
  if (headers === undefined || headers === null) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name);
  const record = headers as Record<string, unknown>;
  const found = record[name] ?? record[name.toLowerCase()];
  return typeof found === 'string' ? found : null;
}

const PAYMENT_METHODS = new Set<PaymentMethod>(['CASH', 'CARD', 'TRANSFER', 'QR']);

/**
 * `FetchLike` que responde como el contrato de ventas con estado en memoria.
 * Cada cliente de fixture tiene su propio almacén.
 */
export function createSalesFixtureFetch(store: SalesFixture = createSalesFixtureStore()): FetchLike {
  const id = (prefix: string, n: number) => `${prefix}-${n}`;
  const idempotencyIndex = new Map<string, Sale>();
  const saleById = (saleId: string) => store.sales.find((sale) => sale.id === saleId);
  const sessionById = (sessionId: string) =>
    store.cashSessions.find((session) => session.id === sessionId);
  const openSessionFor = (branchId: string) =>
    store.cashSessions.find((session) => session.branchId === branchId && session.status === 'OPEN');
  const productById = (productId: string) => store.products.find((product) => product.id === productId);

  function summarizeOpenSession(session: CashSession): CashSession {
    const sales = store.sales.filter(
      (sale) => sale.cashSessionId === session.id && sale.status === 'COMPLETED',
    );
    const totals: Record<string, number> = {};
    for (const sale of sales) {
      for (const payment of sale.payments) {
        totals[payment.method] = round2((totals[payment.method] ?? 0) + payment.amount);
      }
    }
    return { ...session, saleCount: sales.length, totalsByPaymentMethod: totals };
  }

  return async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = readBody(init);

    if (!path.startsWith('/api/v1/sales')) return problem('No encontrado.', 404);

    // --- Caja ---
    if (path === '/api/v1/sales/cash-sessions' && method === 'POST') {
      const branchId = String(body.branchId ?? '').trim();
      const initialAmount = Number(body.initialAmount);
      if (branchId.length === 0 || !Number.isFinite(initialAmount) || initialAmount < 0) {
        return problem('Monto inicial o sucursal inválidos.', 400);
      }
      if (openSessionFor(branchId)) return problem('La sucursal ya tiene un turno abierto.', 409);
      const session: CashSession = {
        id: id('session', store.cashSessions.length + 1),
        branchId,
        openedBy: 'fixture-user',
        initialAmount,
        status: 'OPEN',
        openedAt: new Date().toISOString(),
        closedBy: null,
        closedAt: null,
        expectedAmount: null,
        countedAmount: null,
        difference: null,
        saleCount: 0,
        totalsByPaymentMethod: {},
      };
      store.cashSessions.push(session);
      return json(summarizeOpenSession(session), 201);
    }

    if (path === '/api/v1/sales/cash-sessions' && method === 'GET') {
      const status = url.searchParams.get('status');
      const branchId = url.searchParams.get('branchId');
      let items = store.cashSessions.map((session) =>
        session.status === 'OPEN' ? summarizeOpenSession(session) : session,
      );
      if (status) items = items.filter((session) => session.status === status);
      if (branchId) items = items.filter((session) => session.branchId === branchId);
      return json(items);
    }

    const closeMatch = path.match(/^\/api\/v1\/sales\/cash-sessions\/([^/]+)\/close$/);
    if (closeMatch && method === 'POST') {
      const session = sessionById(decodeURIComponent(closeMatch[1] ?? ''));
      if (!session) return problem('El turno no existe.', 404);
      if (session.status !== 'OPEN') return problem('El turno ya está cerrado.', 409);
      const countedAmount = Number(body.countedAmount);
      if (!Number.isFinite(countedAmount) || countedAmount < 0) {
        return problem('Monto contado inválido.', 400);
      }
      const summary = summarizeOpenSession(session);
      const cashTotal = summary.totalsByPaymentMethod.CASH ?? 0;
      const expectedAmount = round2(session.initialAmount + cashTotal);
      session.status = 'CLOSED';
      session.closedBy = 'fixture-user';
      session.closedAt = new Date().toISOString();
      session.countedAmount = countedAmount;
      session.expectedAmount = expectedAmount;
      session.difference = round2(countedAmount - expectedAmount);
      session.saleCount = summary.saleCount;
      session.totalsByPaymentMethod = summary.totalsByPaymentMethod;
      return json(session);
    }

    const sessionMatch = path.match(/^\/api\/v1\/sales\/cash-sessions\/([^/]+)$/);
    if (sessionMatch && method === 'GET') {
      const session = sessionById(decodeURIComponent(sessionMatch[1] ?? ''));
      if (!session) return problem('El turno no existe.', 404);
      return json(session.status === 'OPEN' ? summarizeOpenSession(session) : session);
    }

    // --- Ventas ---
    if (path === '/api/v1/sales' && method === 'POST') {
      const key = readHeader(init, 'Idempotency-Key');
      if (key === null || key.length === 0) return problem('Falta la clave de idempotencia.', 400);
      const existing = idempotencyIndex.get(key);
      if (existing) return json(existing, 200);

      const branchId = String(body.branchId ?? '').trim();
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const rawPayments = Array.isArray(body.payments) ? body.payments : [];
      const globalDiscount = body.discount === undefined ? 0 : Number(body.discount);
      if (branchId.length === 0 || rawItems.length === 0 || rawPayments.length === 0) {
        return problem('La venta requiere sucursal, ítems y pagos.', 400);
      }
      const session = openSessionFor(branchId);
      if (!session) return problem('La sucursal no tiene un turno de caja abierto.', 409);

      const items: SaleItem[] = [];
      let subtotal = 0;
      let discountTotal = 0;
      let lineNumber = 1;
      for (const raw of rawItems) {
        const item = raw as Record<string, unknown>;
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const discount = item.discount === undefined ? 0 : Number(item.discount);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          return problem('Ítem de venta inválido.', 400);
        }
        if (!Number.isFinite(discount) || discount < 0 || discount > round2(quantity * unitPrice)) {
          return problem('Descuento de ítem inválido.', 400);
        }
        const productId = String(item.productId ?? '');
        const product = productById(productId);
        const lineTotal = round2(quantity * unitPrice - discount);
        subtotal = round2(subtotal + quantity * unitPrice);
        discountTotal = round2(discountTotal + discount);
        items.push({
          id: id('item', lineNumber),
          lineNumber,
          productId,
          sku: product?.sku ?? productId,
          name: product?.name ?? productId,
          unit: product?.unit ?? 'UNIT',
          quantity,
          unitPrice,
          discount,
          lineTotal,
          taxRate: 0,
          taxAmount: 0,
        });
        lineNumber += 1;
      }
      if (!Number.isFinite(globalDiscount) || globalDiscount < 0 || globalDiscount > round2(subtotal - discountTotal)) {
        return problem('Descuento de venta inválido.', 400);
      }
      const total = round2(subtotal - discountTotal - globalDiscount);
      const payments = rawPayments.map((raw, index) => {
        const payment = raw as Record<string, unknown>;
        return {
          id: id('payment', index + 1),
          method: String(payment.method ?? '') as PaymentMethod,
          amount: Number(payment.amount),
        };
      });
      if (payments.some((payment) => !PAYMENT_METHODS.has(payment.method) || !Number.isFinite(payment.amount) || payment.amount < 0)) {
        return problem('Método o importe de pago inválido.', 400);
      }
      const paidTotal = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
      if (paidTotal < total) return problem('Los pagos no cubren el total.', 400);

      const sale: Sale = {
        id: id('sale', store.sales.length + 1),
        number: store.sales.length + 1,
        branchId,
        cashSessionId: session.id,
        status: 'COMPLETED',
        currency: 'BOB',
        subtotal,
        discountTotal: round2(discountTotal + globalDiscount),
        taxTotal: 0,
        total,
        paidTotal,
        createdBy: 'fixture-user',
        createdAt: new Date().toISOString(),
        annulledAt: null,
        annulledBy: null,
        annulReason: null,
        customer: null,
        billing: null,
        items,
        payments,
      };
      store.sales.push(sale);
      idempotencyIndex.set(key, sale);
      return json(sale, 201);
    }

    if (path === '/api/v1/sales' && method === 'GET') {
      const status = url.searchParams.get('status');
      const branchId = url.searchParams.get('branchId');
      const cashSessionId = url.searchParams.get('cashSessionId');
      const page = Number(url.searchParams.get('page') ?? '0');
      const size = Number(url.searchParams.get('size') ?? '50');
      let items: Sale[] = [...store.sales];
      if (status) items = items.filter((sale) => sale.status === status);
      if (branchId) items = items.filter((sale) => sale.branchId === branchId);
      if (cashSessionId) items = items.filter((sale) => sale.cashSessionId === cashSessionId);
      const start = Math.max(0, page * size);
      return json({ items: items.slice(start, start + size), page, size, total: items.length });
    }

    const receiptMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/receipt$/);
    if (receiptMatch && method === 'GET') {
      const sale = saleById(decodeURIComponent(receiptMatch[1] ?? ''));
      if (!sale) return problem('La venta no existe.', 404);
      return json({
        empresaId: 'fixture-empresa',
        empresaSlug: 'fixture',
        number: sale.number,
        status: sale.status,
        createdAt: sale.createdAt,
        branchId: sale.branchId,
        cashSessionId: sale.cashSessionId,
        currency: sale.currency,
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        taxTotal: sale.taxTotal,
        total: sale.total,
        paidTotal: sale.paidTotal,
        customer: sale.customer,
        billing: sale.billing,
        items: sale.items,
        payments: sale.payments,
        annulledAt: sale.annulledAt,
        annulReason: sale.annulReason,
      });
    }

    const annulMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/annul$/);
    if (annulMatch && method === 'POST') {
      const sale = saleById(decodeURIComponent(annulMatch[1] ?? ''));
      if (!sale) return problem('La venta no existe.', 404);
      if (sale.status === 'ANNULLED') return problem('La venta ya está anulada.', 409);
      sale.status = 'ANNULLED';
      sale.annulledAt = new Date().toISOString();
      sale.annulledBy = 'fixture-user';
      sale.annulReason =
        typeof body.reason === 'string' && body.reason.length > 0 ? body.reason : null;
      return json(sale);
    }

    const returnsMatch = path.match(/^\/api\/v1\/sales\/([^/]+)\/returns$/);
    if (returnsMatch) {
      const saleId = decodeURIComponent(returnsMatch[1] ?? '');
      const sale = saleById(saleId);
      if (!sale) return problem('La venta no existe.', 404);

      if (method === 'GET') {
        return json(store.returns.filter((item) => item.saleId === saleId));
      }

      if (method === 'POST') {
        if (sale.status === 'ANNULLED') {
          return problem('No se puede devolver una venta anulada.', 409);
        }
        const rawItems = Array.isArray(body.items) ? body.items : [];
        if (rawItems.length === 0) return problem('La devolución requiere ítems.', 400);
        const returnedByItem = new Map<string, number>();
        for (const existing of store.returns.filter((item) => item.saleId === saleId)) {
          for (const item of existing.items) {
            returnedByItem.set(item.saleItemId, (returnedByItem.get(item.saleItemId) ?? 0) + item.quantity);
          }
        }
        const items: SaleReturn['items'] = [];
        let index = 0;
        for (const raw of rawItems) {
          const item = raw as Record<string, unknown>;
          const saleItemId = String(item.saleItemId ?? '');
          const quantity = Number(item.quantity);
          const sold = sale.items.find((line) => line.id === saleItemId);
          if (!sold) return problem('La línea no pertenece a la venta.', 404);
          const already = returnedByItem.get(saleItemId) ?? 0;
          if (!Number.isFinite(quantity) || quantity <= 0 || quantity > round2(sold.quantity - already)) {
            return problem('La cantidad devuelta supera lo vendido.', 400);
          }
          items.push({
            id: `return-item-${index + 1}`,
            saleItemId,
            quantity,
            amount: round2(quantity * sold.unitPrice),
          });
          index += 1;
        }
        const total = round2(items.reduce((sum, item) => sum + item.amount, 0));
        const returnedItem: SaleReturn = {
          id: id('return', store.returns.length + 1),
          saleId,
          total,
          reason: typeof body.reason === 'string' && body.reason.length > 0 ? body.reason : null,
          createdBy: 'fixture-user',
          createdAt: new Date().toISOString(),
          items,
        };
        store.returns.push(returnedItem);
        return json(returnedItem, 201);
      }
    }

    const saleMatch = path.match(/^\/api\/v1\/sales\/([^/]+)$/);
    if (saleMatch && method === 'GET') {
      const sale = saleById(decodeURIComponent(saleMatch[1] ?? ''));
      if (!sale) return problem('La venta no existe.', 404);
      return json(sale);
    }

    return problem('No encontrado.', 404);
  };
}

/** Cliente de ventas respaldado por el fixture, con la misma interfaz que el real. */
export function createSalesFixtureClient(
  store: SalesFixture = createSalesFixtureStore(),
): SalesClient {
  return createSalesClient({
    baseUrl: 'http://fixture.invalid/api/v1',
    token: 'fixture',
    fetchImpl: createSalesFixtureFetch(store),
    timeoutMs: 1000,
  });
}

/**
 * El fixture sustituye al contrato solo en desarrollo y con activación explícita.
 * En producción siempre se consume la API real.
 */
export function salesFixtureEnabled(isDev: boolean, flag: string | undefined): boolean {
  return isDev && flag === 'true';
}
