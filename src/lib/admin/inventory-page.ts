import type { AdminClient, Product } from '@/lib/admin/catalog-api';

export type InventoryPostResult =
  | { status: 'ok'; message: string; branchId?: string }
  | {
      status: 'error';
      message: string;
      form?: 'branch' | 'movement' | 'transfer';
      branchId?: string;
    };

/** Valida y ejecuta las acciones POST de inventario (sucursal, movimiento, transferencia). */
export async function handleInventoryPost(
  form: FormData,
  client: AdminClient,
): Promise<InventoryPostResult> {
  const action = String(form.get('action') ?? '');

  if (action === 'branch') {
    const code = String(form.get('code') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    if (code.length === 0 || name.length === 0) {
      return { status: 'error', form: 'branch', message: 'El código y el nombre son obligatorios.' };
    }
    const result = await client.createBranch({
      code,
      name,
      address: String(form.get('address') ?? '').trim() || null,
    });
    return result.status === 'ok'
      ? { status: 'ok', message: 'Sucursal creada.' }
      : { status: 'error', form: 'branch', message: result.message };
  }

  if (action === 'movement') {
    const branchId = String(form.get('branchId') ?? '').trim();
    const productId = String(form.get('productId') ?? '').trim();
    const type = String(form.get('type') ?? 'ENTRY') as 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
    const quantity = Number(form.get('quantity') ?? '0');
    if (branchId.length === 0 || productId.length === 0) {
      return { status: 'error', form: 'movement', message: 'Elige la sucursal y el producto.' };
    }
    if (!['ENTRY', 'EXIT', 'ADJUSTMENT'].includes(type)) {
      return { status: 'error', form: 'movement', message: 'Elige un tipo de movimiento válido.' };
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return {
        status: 'error',
        form: 'movement',
        branchId,
        message: 'La cantidad debe ser un número entero mayor o igual a cero.',
      };
    }
    if (type !== 'ADJUSTMENT' && quantity <= 0) {
      return {
        status: 'error',
        form: 'movement',
        branchId,
        message: 'La cantidad debe ser mayor que cero.',
      };
    }
    const result = await client.registerMovement({
      type,
      branchId,
      productId,
      quantity,
      reason: String(form.get('reason') ?? '').trim() || null,
    });
    return result.status === 'ok'
      ? { status: 'ok', message: 'Movimiento registrado.', branchId }
      : { status: 'error', form: 'movement', branchId, message: result.message };
  }

  if (action === 'transfer') {
    const fromBranchId = String(form.get('fromBranchId') ?? '').trim();
    const toBranchId = String(form.get('toBranchId') ?? '').trim();
    const productId = String(form.get('productId') ?? '').trim();
    const quantity = Number(form.get('quantity') ?? '0');
    if (fromBranchId.length === 0 || toBranchId.length === 0 || productId.length === 0) {
      return { status: 'error', form: 'transfer', message: 'Elige origen, destino y producto.' };
    }
    if (fromBranchId === toBranchId) {
      return {
        status: 'error',
        form: 'transfer',
        branchId: fromBranchId,
        message: 'El origen y el destino deben ser distintos.',
      };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        status: 'error',
        form: 'transfer',
        branchId: fromBranchId,
        message: 'La cantidad debe ser un número entero mayor que cero.',
      };
    }
    const result = await client.transferStock({ fromBranchId, toBranchId, productId, quantity });
    return result.status === 'ok'
      ? { status: 'ok', message: 'Transferencia registrada.', branchId: fromBranchId }
      : { status: 'error', form: 'transfer', branchId: fromBranchId, message: result.message };
  }

  return { status: 'error', message: 'Acción no reconocida.' };
}

/** Carga el stock de una sucursal para todos los productos (N+1 acotado). */
export async function loadStockByProduct(
  client: AdminClient,
  branchId: string,
  products: readonly Product[],
): Promise<Map<string, number>> {
  const stockByProduct = new Map<string, number>();
  const stocks = await Promise.all(
    products.map(async (product) => ({
      id: product.id,
      result: await client.getStock(branchId, product.id),
    })),
  );
  for (const { id, result } of stocks) {
    if (result.status === 'ok') stockByProduct.set(id, result.data.quantity);
  }
  return stockByProduct;
}
