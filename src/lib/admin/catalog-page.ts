import type { AdminClient, UpdateProductInput } from '@/lib/admin/catalog-api';

export type CatalogPostResult =
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string; productId?: string };

const VALID_UNITS = new Set(['UNIT', 'KG', 'LITER', 'PACK']);

function numberFrom(form: FormData, name: string): number | null {
  const raw = String(form.get(name) ?? '').trim();
  if (raw.length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Valida y ejecuta las acciones POST del catálogo (crear y editar). */
export async function handleCatalogPost(
  form: FormData,
  client: AdminClient,
): Promise<CatalogPostResult> {
  const action = String(form.get('action') ?? '');

  if (action === 'category') {
    const name = String(form.get('name') ?? '').trim();
    if (name.length === 0) return { status: 'error', message: 'Escribe el nombre de la categoría.' };
    const result = await client.createCategory(name);
    return result.status === 'ok'
      ? { status: 'ok', message: 'Categoría creada.' }
      : { status: 'error', message: result.message };
  }

  if (action === 'category-status') {
    const categoryId = String(form.get('categoryId') ?? '').trim();
    const active = String(form.get('active') ?? '') === 'true';
    if (categoryId.length === 0) {
      return { status: 'error', message: 'No se identificó la categoría.' };
    }
    const result = await client.updateCategory(categoryId, active);
    return result.status === 'ok'
      ? { status: 'ok', message: active ? 'Categoría activada.' : 'Categoría desactivada.' }
      : { status: 'error', message: result.message };
  }

  if (action === 'product-status') {
    const productId = String(form.get('productId') ?? '').trim();
    const active = String(form.get('active') ?? '') === 'true';
    if (productId.length === 0) {
      return { status: 'error', message: 'No se identificó el producto.' };
    }
    const result = await client.updateProduct(productId, { active });
    return result.status === 'ok'
      ? { status: 'ok', message: active ? 'Producto activado.' : 'Producto desactivado.' }
      : { status: 'error', message: result.message, productId };
  }

  if (action === 'product-update') {
    const productId = String(form.get('productId') ?? '').trim();
    if (productId.length === 0) {
      return { status: 'error', message: 'No se identificó el producto.' };
    }

    const name = String(form.get('name') ?? '').trim();
    const unit = String(form.get('unit') ?? '');
    const unitPrice = numberFrom(form, 'unitPrice');
    const taxRate = numberFrom(form, 'taxRate');
    const costPrice = numberFrom(form, 'costPrice');

    if (name.length === 0) {
      return { status: 'error', message: 'El nombre del producto es obligatorio.', productId };
    }
    if (!VALID_UNITS.has(unit)) {
      return { status: 'error', message: 'Elige una unidad válida.', productId };
    }
    if (unitPrice === null || Number.isNaN(unitPrice) || unitPrice < 0) {
      return {
        status: 'error',
        message: 'El precio debe ser un número mayor o igual a cero.',
        productId,
      };
    }
    if (taxRate === null || Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return { status: 'error', message: 'El impuesto debe estar entre 0 y 100.', productId };
    }
    if (costPrice !== null && (Number.isNaN(costPrice) || costPrice < 0)) {
      return {
        status: 'error',
        message: 'El costo debe ser un número mayor o igual a cero.',
        productId,
      };
    }

    const categoryId = String(form.get('categoryId') ?? '').trim();
    const input: UpdateProductInput = {
      name,
      description: String(form.get('description') ?? '').trim(),
      barcode: String(form.get('barcode') ?? '').trim() || null,
      unit,
      unitPrice,
      taxRate,
      active: String(form.get('active') ?? '') === 'true',
    };
    if (categoryId.length > 0) input.categoryId = categoryId;
    if (costPrice !== null) input.costPrice = costPrice;

    const result = await client.updateProduct(productId, input);
    return result.status === 'ok'
      ? { status: 'ok', message: 'Producto actualizado.' }
      : { status: 'error', message: result.message, productId };
  }

  if (action === 'product') {
    const sku = String(form.get('sku') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const unitPrice = numberFrom(form, 'unitPrice');
    const taxRate = numberFrom(form, 'taxRate');
    if (sku.length === 0 || name.length === 0) {
      return { status: 'error', message: 'El SKU y el nombre del producto son obligatorios.' };
    }
    if (unitPrice === null || Number.isNaN(unitPrice) || unitPrice < 0) {
      return { status: 'error', message: 'El precio debe ser un número mayor o igual a cero.' };
    }
    if (taxRate === null || Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return { status: 'error', message: 'El impuesto debe estar entre 0 y 100.' };
    }
    const result = await client.createProduct({
      sku,
      name,
      unit: String(form.get('unit') ?? 'UNIT'),
      unitPrice,
      taxRate,
      barcode: String(form.get('barcode') ?? '').trim() || null,
      categoryId: String(form.get('categoryId') ?? '').trim() || null,
    });
    return result.status === 'ok'
      ? { status: 'ok', message: 'Producto creado.' }
      : { status: 'error', message: result.message };
  }

  return { status: 'error', message: 'Acción no reconocida.' };
}
