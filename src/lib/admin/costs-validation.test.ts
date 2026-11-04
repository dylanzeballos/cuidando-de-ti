import { describe, expect, it } from 'vitest';
import {
  isValidPeriod,
  validateCostInput,
  validateExpenseInput,
} from '@/lib/admin/costs-validation';

describe('validateCostInput', () => {
  it('acepta un costo no negativo válido', () => {
    expect(validateCostInput({ productId: 'p1', branchId: 'b1', amountRaw: '6.50' })).toBeNull();
    expect(validateCostInput({ productId: 'p1', branchId: 'b1', amountRaw: '0' })).toBeNull();
  });

  it('exige producto, sucursal y monto', () => {
    expect(validateCostInput({ productId: '', branchId: 'b1', amountRaw: '1' })).toBe('product-required');
    expect(validateCostInput({ productId: 'p1', branchId: '', amountRaw: '1' })).toBe('branch-required');
    expect(validateCostInput({ productId: 'p1', branchId: 'b1', amountRaw: '  ' })).toBe('amount-required');
  });

  it('rechaza un monto no numérico y uno negativo', () => {
    expect(validateCostInput({ productId: 'p1', branchId: 'b1', amountRaw: 'abc' })).toBe('amount-invalid');
    expect(validateCostInput({ productId: 'p1', branchId: 'b1', amountRaw: '-1' })).toBe('amount-negative');
  });
});

describe('validateExpenseInput', () => {
  it('acepta un gasto con concepto, monto y periodo válidos', () => {
    expect(validateExpenseInput({ concept: 'Alquiler', amountRaw: '800', period: '2026-10' })).toBeNull();
  });

  it('exige concepto, plazo y monto', () => {
    expect(validateExpenseInput({ concept: '', amountRaw: '1', period: '2026-10' })).toBe('concept-required');
    expect(validateExpenseInput({ concept: 'X', amountRaw: '1', period: '' })).toBe('period-required');
    expect(validateExpenseInput({ concept: 'X', amountRaw: '', period: '2026-10' })).toBe('amount-required');
  });

  it('rechaza un periodo con formato inválido y un monto negativo', () => {
    expect(validateExpenseInput({ concept: 'X', amountRaw: '1', period: '2026-13' })).toBe('period-invalid');
    expect(validateExpenseInput({ concept: 'X', amountRaw: '-5', period: '2026-10' })).toBe('amount-negative');
  });
});

describe('isValidPeriod', () => {
  it('solo admite el mes calendario YYYY-MM', () => {
    expect(isValidPeriod('2026-10')).toBe(true);
    expect(isValidPeriod('2026-00')).toBe(false);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('2026/10')).toBe(false);
    expect(isValidPeriod('octubre')).toBe(false);
  });
});
