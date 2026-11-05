import type { CostsLiveClient } from '@/lib/admin/costs-live-api';

export type CostsPostResult =
  | { status: 'ok'; message: string; branchId?: string }
  | { status: 'error'; message: string; form?: 'cost' | 'expense'; branchId?: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Valida y registra un costo de compra. */
export async function handleCostPost(
  form: FormData,
  costs: CostsLiveClient,
): Promise<CostsPostResult> {
  const productId = String(form.get('productId') ?? '').trim();
  const branchId = String(form.get('branchId') ?? '').trim();
  const amountRaw = String(form.get('amount') ?? '').trim();
  const validFrom = String(form.get('validFrom') ?? '').trim() || isoToday();
  const amount = Number(amountRaw);

  if (branchId.length === 0) {
    return { status: 'error', form: 'cost', message: 'Elige la sucursal.' };
  }
  if (productId.length === 0) {
    return { status: 'error', form: 'cost', branchId, message: 'Elige el producto.' };
  }
  if (amountRaw.length === 0 || !Number.isFinite(amount) || amount < 0) {
    return {
      status: 'error',
      form: 'cost',
      branchId,
      message: 'El costo debe ser un número mayor o igual a cero.',
    };
  }
  if (!ISO_DATE.test(validFrom)) {
    return {
      status: 'error',
      form: 'cost',
      branchId,
      message: 'Indica una fecha de vigencia válida.',
    };
  }

  const result = await costs.createCost({ branchId, productId, costPrice: amount, validFrom });
  return result.status === 'ok'
    ? { status: 'ok', message: 'Costo registrado.', branchId }
    : { status: 'error', form: 'cost', branchId, message: result.message };
}

/** Valida y registra un gasto operativo del periodo. */
export async function handleExpensePost(
  form: FormData,
  costs: CostsLiveClient,
  fallbackDate: string,
): Promise<CostsPostResult> {
  const category = String(form.get('category') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const amountRaw = String(form.get('amount') ?? '').trim();
  const expenseDate = String(form.get('expenseDate') ?? '').trim() || fallbackDate;
  const branchId = String(form.get('branchId') ?? '').trim();
  const amount = Number(amountRaw);

  if (category.length === 0) {
    return { status: 'error', form: 'expense', message: 'Escribe la categoría del gasto.' };
  }
  if (description.length === 0) {
    return { status: 'error', form: 'expense', message: 'Escribe la descripción del gasto.' };
  }
  if (amountRaw.length === 0 || !Number.isFinite(amount) || amount < 0) {
    return {
      status: 'error',
      form: 'expense',
      message: 'El monto debe ser un número mayor o igual a cero.',
    };
  }
  if (!ISO_DATE.test(expenseDate)) {
    return { status: 'error', form: 'expense', message: 'Indica una fecha válida.' };
  }

  const result = await costs.createExpense({
    category,
    description,
    amount,
    expenseDate,
    branchId: branchId.length > 0 ? branchId : null,
  });
  return result.status === 'ok'
    ? { status: 'ok', message: 'Gasto registrado.' }
    : { status: 'error', form: 'expense', message: result.message };
}
