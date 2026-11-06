import type { APIRoute } from 'astro';
import { resolveSalesClient } from '@/lib/sales/sales-service';
import { validateCart, type CartLine } from '@/lib/sales/cart';
import { validateInvoiceInput } from '@/lib/billing/validation';
import type { PaymentMethod } from '@/lib/sales/sales-api';

export const prerender = false;

const PAYMENT_METHODS = new Set<PaymentMethod>(['CASH', 'CARD', 'TRANSFER', 'QR']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type ItemBody = { productId?: unknown; quantity?: unknown; unitPrice?: unknown; discount?: unknown };
type PaymentBody = { method?: unknown; amount?: unknown };
type SaleBody = {
  branchId?: unknown;
  items?: unknown;
  payments?: unknown;
  discount?: unknown;
  invoiceRequired?: unknown;
  customer?: unknown;
};

/**
 * Endpoint interno del POS. La isla del navegador llama aquí: el servidor lee
 * `Astro.session`, resuelve la empresa de la instalación y usa el cliente de
 * ventas. Nunca recibe la empresa del navegador ni expone el token.
 */
export const POST: APIRoute = async ({ request, session }) => {
  const auth = await session?.get('auth');
  if (!auth) {
    return json({ status: 'unauthorized', message: 'La sesión expiró. Vuelve a iniciar sesión.' }, 401);
  }

  let body: SaleBody;
  try {
    body = (await request.json()) as SaleBody;
  } catch {
    return json({ status: 'validation', message: 'Solicitud no válida.' }, 400);
  }

  const branchId = typeof body.branchId === 'string' ? body.branchId.trim() : '';
  if (branchId.length === 0) {
    return json({ status: 'validation', message: 'Elige una sucursal para la venta.' }, 400);
  }

  const rawItems = Array.isArray(body.items) ? (body.items as ItemBody[]) : [];
  const lines: CartLine[] = rawItems.map((item) => ({
    productId: typeof item.productId === 'string' ? item.productId : '',
    sku: typeof item.productId === 'string' ? item.productId : '',
    name: typeof item.productId === 'string' ? item.productId : 'producto',
    unit: 'UNIT',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discount: item.discount === undefined ? 0 : Number(item.discount),
  }));

  // Validación en servidor antes de llamar a la API.
  const discount = body.discount === undefined ? 0 : Number(body.discount);
  const cart = validateCart(lines, discount);
  if (!cart.ok) {
    return json({ status: 'validation', message: cart.message }, 400);
  }

  const rawPayments = Array.isArray(body.payments) ? (body.payments as PaymentBody[]) : [];
  const payments = rawPayments.map((payment) => ({
    method: String(payment.method ?? '') as PaymentMethod,
    amount: Number(payment.amount),
  }));
  if (
    payments.length === 0 ||
    payments.some(
      (payment) =>
        !PAYMENT_METHODS.has(payment.method) ||
        !Number.isFinite(payment.amount) ||
        payment.amount < 0,
    )
  ) {
    return json({ status: 'validation', message: 'Elige un método de pago válido.' }, 400);
  }

  const rawCustomer =
    body.customer !== null && typeof body.customer === 'object'
      ? (body.customer as Record<string, unknown>)
      : undefined;
  const invoice = validateInvoiceInput({
    invoiceRequired: body.invoiceRequired === true,
    nit: rawCustomer?.documentNumber,
    name: rawCustomer?.name,
    email: rawCustomer?.email,
    address: rawCustomer?.address,
  });
  if (!invoice.ok) {
    return json({ status: 'validation', message: invoice.message }, 400);
  }

  const sales = resolveSalesClient(auth.accessToken);

  // Impide registrar sin turno abierto: la pantalla ya lo guía y aquí se vuelve a
  // comprobar en el servidor.
  const sessions = await sales.listCashSessions({ status: 'OPEN', branchId });
  if (sessions.status !== 'ok') {
    if (sessions.status === 'unauthorized') {
      return json({ status: 'unauthorized', message: sessions.message }, 401);
    }
    return json({ status: 'unavailable', message: sessions.message }, 503);
  }
  if (sessions.data.every((cashSession) => cashSession.branchId !== branchId)) {
    return json(
      { status: 'conflict', message: 'Abre la caja de la sucursal antes de registrar la venta.' },
      409,
    );
  }

  const headerKey = request.headers.get('Idempotency-Key');
  const idempotencyKey =
    headerKey && headerKey.trim().length > 0
      ? headerKey
      : `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const result = await sales.createSale(
    {
      branchId,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
      })),
      discount,
      payments,
      invoiceRequired: invoice.invoiceRequired,
      ...(invoice.customer ? { customer: invoice.customer } : {}),
    },
    idempotencyKey,
  );

  if (result.status === 'ok') {
    return json({
      status: 'ok',
      saleId: result.data.id,
      number: result.data.number,
      billingDocumentId: result.data.billing?.documentId,
      invoiceNumber: result.data.billing?.number,
      billingStatus: result.data.billing?.status,
    });
  }
  if (result.status === 'unauthorized') {
    return json({ status: 'unauthorized', message: result.message }, 401);
  }
  if (result.status === 'unavailable') {
    return json({ status: 'unavailable', message: result.message }, 503);
  }
  return json({ status: result.status, message: result.message }, 400);
};
