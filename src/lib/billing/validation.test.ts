import { describe, expect, it } from 'vitest';
import { normalizeNit, validateInvoiceInput } from '@/lib/billing/validation';

describe('validateInvoiceInput', () => {
  it('no exige factura si el interruptor está apagado', () => {
    expect(validateInvoiceInput({ invoiceRequired: false, nit: '' })).toEqual({
      ok: true,
      invoiceRequired: false,
    });
  });

  it('exige NIT y razón social al facturar', () => {
    const missingNit = validateInvoiceInput({ invoiceRequired: true, nit: '', name: 'ACME' });
    expect(missingNit.ok).toBe(false);
    const missingName = validateInvoiceInput({
      invoiceRequired: true,
      nit: '123456789',
      name: '',
    });
    expect(missingName.ok).toBe(false);
  });

  it('normaliza separadores del NIT y devuelve el comprador', () => {
    const result = validateInvoiceInput({
      invoiceRequired: true,
      nit: '123.456-789',
      name: 'Farmacia del Sur',
      email: 'compras@farmacia.test',
    });
    expect(result).toEqual({
      ok: true,
      invoiceRequired: true,
      customer: {
        documentType: 'NIT',
        documentNumber: '123456789',
        name: 'Farmacia del Sur',
        email: 'compras@farmacia.test',
      },
    });
  });

  it('normaliza un NIT con espacios', () => {
    expect(normalizeNit(' 12 345 6789 ')).toBe('123456789');
  });
});
