import { describe, expect, it } from 'vitest';
import {
  formDataToObject,
  validateCatalogForm,
  validateCatalogValues,
} from '@/lib/admin/catalog-schema';

function formData(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

const VALID_PRODUCT = {
  name: 'Paracetamol 500 mg',
  brand: 'Genomma',
  unit: 'UNIT',
  unitPrice: '12.50',
};

describe('catálogo: validación compartida', () => {
  it('acepta un producto válido y normaliza los campos opcionales', () => {
    const result = validateCatalogValues('product', {
      ...VALID_PRODUCT,
      brand: '  Genomma  ',
      categoryId: '',
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.action !== 'product') return;
    expect(result.data.brand).toBe('Genomma');
    expect(result.data.unitPrice).toBe(12.5);
  });

  it('rechaza nombre vacío y precio negativo', () => {
    const result = validateCatalogValues('product', {
      ...VALID_PRODUCT,
      name: ' ',
      unitPrice: '-2',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.name).toBeDefined();
    expect(result.fieldErrors.unitPrice).toContain('negativo');
  });

  it('convierte el estado de la edición a booleano', () => {
    const result = validateCatalogValues('product-update', {
      ...VALID_PRODUCT,
      productId: 'p-1',
      active: 'false',
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.action !== 'product-update') return;
    expect(result.data.active).toBe(false);
  });

  it('exige el nombre de la categoría', () => {
    const result = validateCatalogValues('category', { name: '  ' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.name).toContain('obligatorio');
  });

  it('lee el FormData del servidor con las mismas reglas', () => {
    const result = validateCatalogForm('product', formData(VALID_PRODUCT));

    expect(result.ok).toBe(true);
  });

  it('ignora valores que no son cadenas al convertir FormData', () => {
    const form = formData({ name: 'Agua' });
    form.set('archivo', new Blob(['x']));

    expect(formDataToObject(form)).toEqual({ name: 'Agua' });
  });
});
