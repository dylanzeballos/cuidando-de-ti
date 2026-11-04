import type { PaymentMethod } from '@/lib/sales/sales-api';

/**
 * Cálculos del carrito del POS como funciones puras. Se comparten entre la isla
 * React (para mostrar) y la validación del servidor (para registrar), de modo que
 * lo mostrado y lo enviado no diverjan. El total autoritativo sigue siendo el del
 * backend (`subtotal − discountTotal`).
 */

export type CartLine = {
  /** Producto del catálogo que origina la línea. */
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  /** Precio unitario de catálogo. El total de la venta no añade impuesto. */
  unitPrice: number;
  /** Descuento por línea, nunca negativo ni mayor al subtotal de la línea. */
  discount: number;
  /** Tasa de impuesto del catálogo, solo para el desglose informativo. */
  taxRate: number;
};

export type CartLineTotal = {
  line: CartLine;
  subtotal: number;
  discount: number;
  lineTotal: number;
  /** Impuesto incluido en `lineTotal` a partir de `taxRate`; no se suma al total. */
  taxIncluded: number;
};

export type CartTotals = {
  lines: CartLineTotal[];
  subtotal: number;
  discountTotal: number;
  total: number;
  /** Suma del impuesto incluido en las líneas; informativo. */
  taxIncluded: number;
};

/** Redondeo estable a dos decimales (moneda BOB). */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Una cantidad es válida si es finita y mayor que cero. */
export function isValidQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0;
}

/** Subtotal de una línea antes del descuento. */
export function lineSubtotal(line: Pick<CartLine, 'quantity' | 'unitPrice'>): number {
  return round2(line.quantity * line.unitPrice);
}

/** Descuento efectivo de una línea, acotado a su subtotal y nunca negativo. */
export function lineDiscount(line: Pick<CartLine, 'quantity' | 'unitPrice' | 'discount'>): number {
  const subtotal = lineSubtotal(line);
  if (!Number.isFinite(line.discount) || line.discount <= 0) return 0;
  return round2(Math.min(line.discount, subtotal));
}

/** Total de una línea: subtotal menos descuento. */
export function lineTotal(line: Pick<CartLine, 'quantity' | 'unitPrice' | 'discount'>): number {
  return round2(lineSubtotal(line) - lineDiscount(line));
}

/**
 * Impuesto incluido en el total de una línea, a partir de la tasa del catálogo.
 * Es un desglose informativo: `unitPrice` ya incluye el impuesto, de modo que el
 * total mostrado coincide con el que registra el backend.
 */
export function lineTaxIncluded(
  line: Pick<CartLine, 'quantity' | 'unitPrice' | 'discount' | 'taxRate'>,
): number {
  const rate = Number.isFinite(line.taxRate) ? line.taxRate : 0;
  if (rate <= 0) return 0;
  const gross = lineTotal(line);
  return round2(gross - gross / (1 + rate / 100));
}

/** Totales del carrito: subtotal, descuentos, total e impuesto incluido. */
export function computeCart(lines: readonly CartLine[]): CartTotals {
  const computed: CartLineTotal[] = lines.map((line) => ({
    line,
    subtotal: lineSubtotal(line),
    discount: lineDiscount(line),
    lineTotal: lineTotal(line),
    taxIncluded: lineTaxIncluded(line),
  }));

  let subtotal = 0;
  let discountTotal = 0;
  let total = 0;
  let taxIncluded = 0;
  for (const item of computed) {
    subtotal = round2(subtotal + item.subtotal);
    discountTotal = round2(discountTotal + item.discount);
    total = round2(total + item.lineTotal);
    taxIncluded = round2(taxIncluded + item.taxIncluded);
  }

  return { lines: computed, subtotal, discountTotal, total, taxIncluded };
}

export type CartValidation = { ok: true } | { ok: false; message: string };

/**
 * Validación de servidor del carrito antes de registrar. Un carrito sin líneas o
 * con cantidades inválidas se rechaza sin llamar a la API.
 */
export function validateCart(lines: readonly CartLine[], discount = 0): CartValidation {
  if (lines.length === 0) return { ok: false, message: 'Agrega al menos un producto a la venta.' };
  for (const line of lines) {
    if (!isValidQuantity(line.quantity)) {
      return { ok: false, message: `La cantidad de ${line.name} debe ser mayor que cero.` };
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      return { ok: false, message: `El precio de ${line.name} no es válido.` };
    }
    if (!Number.isFinite(line.discount) || line.discount < 0) {
      return { ok: false, message: `El descuento de ${line.name} no es válido.` };
    }
    if (round2(line.discount) > lineSubtotal(line)) {
      return { ok: false, message: `El descuento de ${line.name} supera su importe.` };
    }
  }
  const totals = computeCart(lines);
  if (!Number.isFinite(discount) || discount < 0) {
    return { ok: false, message: 'El descuento de la venta no es válido.' };
  }
  if (round2(discount) > totals.subtotal - totals.discountTotal) {
    return { ok: false, message: 'El descuento de la venta supera el importe.' };
  }
  return { ok: true };
}

/** Métodos de pago soportados por el contrato, con su etiqueta legible. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  QR: 'QR',
};

/** Etiqueta legible de un método de pago; un valor desconocido se muestra tal cual. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

/** Formato de moneda BOB para mostrar en la interfaz. */
export function formatMoney(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `Bs ${amount.toFixed(2)}`;
}
