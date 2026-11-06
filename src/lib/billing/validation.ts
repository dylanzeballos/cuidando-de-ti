export type InvoiceCustomer = {
  documentType: 'NIT';
  documentNumber: string;
  name: string;
  email?: string;
  address?: string;
};

export type InvoiceValidation =
  | { ok: true; invoiceRequired: boolean; customer?: InvoiceCustomer }
  | { ok: false; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normaliza un NIT escrito con espacios, puntos o guiones. */
export function normalizeNit(value: string): string {
  return value.replace(/[\s.-]/g, '');
}

/**
 * Regla compartida por el POS y el endpoint interno: con NIT se emite factura;
 * sin NIT la venta queda como comprobante interno. La validación del servidor
 * vuelve a aplicarla.
 */
export function validateInvoiceInput(input: {
  invoiceRequired?: unknown;
  nit?: unknown;
  name?: unknown;
  email?: unknown;
  address?: unknown;
}): InvoiceValidation {
  const required = input.invoiceRequired === true;
  if (!required) {
    return { ok: true, invoiceRequired: false };
  }

  const rawNit = typeof input.nit === 'string' ? input.nit.trim() : '';
  const documentNumber = normalizeNit(rawNit);
  if (!/^[0-9]{7,14}$/.test(documentNumber)) {
    return { ok: false, message: 'Escribe un NIT válido de 7 a 14 dígitos.' };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 3) {
    return { ok: false, message: 'Escribe la razón social del comprador.' };
  }

  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (email.length > 0 && !EMAIL.test(email)) {
    return { ok: false, message: 'El correo del comprador no es válido.' };
  }

  const address = typeof input.address === 'string' ? input.address.trim() : '';
  return {
    ok: true,
    invoiceRequired: true,
    customer: {
      documentType: 'NIT',
      documentNumber,
      name,
      ...(email.length > 0 ? { email } : {}),
      ...(address.length > 0 ? { address } : {}),
    },
  };
}
