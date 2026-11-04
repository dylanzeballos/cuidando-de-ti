/**
 * Validación de servidor de los formularios de costos y gastos. Es pura y no
 * llama a la API: los datos inválidos se rechazan antes de cualquier petición.
 * Se prueba con Vitest.
 */

export type CostFieldError =
  | 'product-required'
  | 'branch-required'
  | 'amount-required'
  | 'amount-invalid'
  | 'amount-negative';

export const COST_FIELD_ERRORS: ReadonlySet<string> = new Set<CostFieldError>([
  'product-required',
  'branch-required',
  'amount-required',
  'amount-invalid',
  'amount-negative',
]);

export type ExpenseFieldError =
  | 'concept-required'
  | 'period-required'
  | 'period-invalid'
  | 'amount-required'
  | 'amount-invalid'
  | 'amount-negative';

export const EXPENSE_FIELD_ERRORS: ReadonlySet<string> = new Set<ExpenseFieldError>([
  'concept-required',
  'period-required',
  'period-invalid',
  'amount-required',
  'amount-invalid',
  'amount-negative',
]);

/** Periodo como mes calendario `YYYY-MM`. */
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD.test(period.trim());
}

/** Primer error del campo monto, o `null` si es un monto no negativo válido. */
function validateAmount(amountRaw: string): 'amount-required' | 'amount-invalid' | 'amount-negative' | null {
  const raw = amountRaw.trim();
  if (raw.length === 0) return 'amount-required';
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return 'amount-invalid';
  if (amount < 0) return 'amount-negative';
  return null;
}

/** Primer error del registro de costo, o `null` si el formulario es válido. */
export function validateCostInput(input: {
  productId: string;
  branchId: string;
  amountRaw: string;
}): CostFieldError | null {
  if (input.productId.trim().length === 0) return 'product-required';
  if (input.branchId.trim().length === 0) return 'branch-required';
  return validateAmount(input.amountRaw);
}

/** Primer error del registro de gasto, o `null` si el formulario es válido. */
export function validateExpenseInput(input: {
  concept: string;
  amountRaw: string;
  period: string;
}): ExpenseFieldError | null {
  if (input.concept.trim().length === 0) return 'concept-required';
  if (input.period.trim().length === 0) return 'period-required';
  if (!isValidPeriod(input.period)) return 'period-invalid';
  return validateAmount(input.amountRaw);
}
