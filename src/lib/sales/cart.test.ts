import { describe, expect, it } from 'vitest';
import {
  computeCart,
  formatMoney,
  isValidQuantity,
  lineDiscount,
  lineSubtotal,
  lineTaxIncluded,
  lineTotal,
  paymentMethodLabel,
  round2,
  validateCart,
  type CartLine,
} from '@/lib/sales/cart';

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    sku: 'AGUA-2L',
    name: 'Agua 2L',
    unit: 'UNIT',
    quantity: 2,
    unitPrice: 8.5,
    discount: 0,
    taxRate: 13,
    ...overrides,
  };
}

describe('cart', () => {
  it('calcula el subtotal por línea', () => {
    expect(lineSubtotal(line({ quantity: 3, unitPrice: 2.5 }))).toBe(7.5);
  });

  it('acota el descuento de línea al subtotal y nunca es negativo', () => {
    expect(lineDiscount(line({ quantity: 2, unitPrice: 8.5, discount: 1 }))).toBe(1);
    expect(lineDiscount(line({ quantity: 2, unitPrice: 8.5, discount: 99 }))).toBe(17);
    expect(lineDiscount(line({ quantity: 2, unitPrice: 8.5, discount: -5 }))).toBe(0);
  });

  it('calcula el total de la línea', () => {
    expect(lineTotal(line({ quantity: 2, unitPrice: 8.5, discount: 2 }))).toBe(15);
  });

  it('redondea a dos decimales de forma estable', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(8.5 * 3)).toBe(25.5);
  });

  it('calcula el impuesto incluido a partir de la tasa del catálogo', () => {
    // 17.00 con 13% incluido → impuesto ≈ 1.96.
    expect(lineTaxIncluded(line({ quantity: 2, unitPrice: 8.5, taxRate: 13 }))).toBe(1.96);
    expect(lineTaxIncluded(line({ taxRate: 0 }))).toBe(0);
  });

  it('suma los totales del carrito con descuentos', () => {
    const totals = computeCart([
      line({ quantity: 2, unitPrice: 8.5, discount: 1 }),
      line({ productId: 'p2', name: 'Pan', quantity: 1, unitPrice: 3, taxRate: 0 }),
    ]);
    expect(totals.subtotal).toBe(20);
    expect(totals.discountTotal).toBe(1);
    expect(totals.total).toBe(19);
    expect(totals.lines).toHaveLength(2);
    expect(totals.taxIncluded).toBe(1.84);
  });

  it('valida una cantidad finita y positiva', () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-2)).toBe(false);
    expect(isValidQuantity(Number.NaN)).toBe(false);
    expect(isValidQuantity(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rechaza un carrito vacío o con cantidades inválidas', () => {
    expect(validateCart([])).toEqual({ ok: false, message: 'Agrega al menos un producto a la venta.' });
    const bad = validateCart([line({ quantity: 0 })]);
    expect(bad.ok).toBe(false);
    expect(validateCart([line()])).toEqual({ ok: true });
  });

  it('rechaza un descuento global mayor al importe', () => {
    const result = validateCart([line({ quantity: 2, unitPrice: 8.5 })], 20);
    expect(result.ok).toBe(false);
  });

  it('etiqueta los métodos de pago y formatea la moneda', () => {
    expect(paymentMethodLabel('CASH')).toBe('Efectivo');
    expect(paymentMethodLabel('OTRO')).toBe('OTRO');
    expect(formatMoney(15)).toBe('Bs 15.00');
    expect(formatMoney(null)).toBe('Bs 0.00');
  });
});
