import type {
  AdminClient,
  CreateProductInput,
  UpdateProductInput,
} from '@/lib/admin/catalog-api';
import {
  validateCatalogForm,
  type CatalogFormAction,
} from '@/lib/admin/catalog-schema';

export type CatalogForm = CatalogFormAction;

export type CatalogPostResult =
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string; form?: CatalogForm; productId?: string };

function idFrom(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

/** Valida y ejecuta las acciones POST del catálogo (crear y editar). */
export async function handleCatalogPost(
  form: FormData,
  client: AdminClient,
): Promise<CatalogPostResult> {
  const action = String(form.get('action') ?? '');

  if (action === 'category') {
    const parsed = validateCatalogForm('category', form);
    if (!parsed.ok) return { status: 'error', form: 'category', message: parsed.message };
    if (parsed.action !== 'category') {
      return { status: 'error', form: 'category', message: 'Formulario no reconocido.' };
    }
    const result = await client.createCategory(parsed.data.name);
    return result.status === 'ok'
      ? { status: 'ok', message: 'Categoría creada.' }
      : { status: 'error', form: 'category', message: result.message };
  }

  if (action === 'category-status') {
    const categoryId = idFrom(form, 'categoryId');
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
    const productId = idFrom(form, 'productId');
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
    const productId = idFrom(form, 'productId');
    const parsed = validateCatalogForm('product-update', form);
    if (!parsed.ok) {
      return {
        status: 'error',
        form: 'product-update',
        message: parsed.message,
        productId,
      };
    }
    if (parsed.action !== 'product-update') {
      return {
        status: 'error',
        form: 'product-update',
        message: 'Formulario no reconocido.',
        productId,
      };
    }

    const data = parsed.data;
    const input: UpdateProductInput = {
      name: data.name,
      brand: data.brand ?? '',
      description: data.description ?? '',
      unit: data.unit,
      unitPrice: data.unitPrice,
      active: data.active,
    };
    if (data.costPrice !== undefined) input.costPrice = data.costPrice;
    if (data.categoryId.length > 0) input.categoryId = data.categoryId;

    const result = await client.updateProduct(data.productId, input);
    return result.status === 'ok'
      ? { status: 'ok', message: 'Producto actualizado.' }
      : { status: 'error', form: 'product-update', message: result.message, productId };
  }

  if (action === 'product') {
    const parsed = validateCatalogForm('product', form);
    if (!parsed.ok) return { status: 'error', form: 'product', message: parsed.message };
    if (parsed.action !== 'product') {
      return { status: 'error', form: 'product', message: 'Formulario no reconocido.' };
    }

    const data = parsed.data;
    const input: CreateProductInput = {
      name: data.name,
      brand: data.brand,
      description: data.description,
      unit: data.unit,
      unitPrice: data.unitPrice,
      categoryId: data.categoryId.length > 0 ? data.categoryId : null,
    };
    if (data.costPrice !== undefined) input.costPrice = data.costPrice;

    const result = await client.createProduct(input);
    return result.status === 'ok'
      ? { status: 'ok', message: `Producto creado con SKU ${result.data.sku}.` }
      : { status: 'error', form: 'product', message: result.message };
  }

  return { status: 'error', message: 'Acción no reconocida.' };
}
