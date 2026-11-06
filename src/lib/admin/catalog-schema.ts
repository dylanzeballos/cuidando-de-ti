/**
 * Esquemas de validación del catálogo. Se comparten entre el servidor (POST de
 * Astro) y el navegador (validación anticipada del formulario), de modo que las
 * reglas y los mensajes vivan en un único lugar.
 */
import { z } from 'zod';

export const CATALOG_UNITS = ['UNIT', 'KG', 'LITER', 'PACK'] as const;

export type CatalogUnit = (typeof CATALOG_UNITS)[number];

export const UNIT_LABELS: Record<CatalogUnit, string> = {
  UNIT: 'Unidad',
  KG: 'Kilogramo',
  LITER: 'Litro',
  PACK: 'Paquete',
};

/** Etiqueta legible de una unidad; conserva el valor si no es conocida. */
export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit as CatalogUnit] ?? unit;
}

export type CatalogFormAction = 'product' | 'product-update' | 'category';

export type FieldErrors = Record<string, string>;

const requiredText = (max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio.` })
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} no puede superar ${max} caracteres.`);

const nullableText = (max: number, label: string) =>
  z
    .string({ error: `${label} no es válido.` })
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres.`)
    .optional()
    .default('')
    .transform((value) => (value.length > 0 ? value : null));

function toNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const raw = value.trim();
  return raw.length === 0 ? undefined : Number(raw);
}

const requiredNumber = (label: string) =>
  z.preprocess(
    toNumber,
    z
      .number({ error: `${label} debe ser un número.` })
      .min(0, `${label} no puede ser negativo.`)
      .max(9999999999.99, `${label} es demasiado grande.`),
  );

const optionalNumber = (label: string) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : toNumber(value)),
    z
      .number({ error: `${label} debe ser un número.` })
      .min(0, `${label} no puede ser negativo.`)
      .max(9999999999.99, `${label} es demasiado grande.`)
      .optional(),
  );

const productFields = {
  name: requiredText(200, 'El nombre'),
  brand: nullableText(120, 'La marca'),
  description: nullableText(500, 'La descripción'),
  unit: z.enum(CATALOG_UNITS, { error: 'Elige una unidad válida.' }),
  unitPrice: requiredNumber('El precio'),
  costPrice: optionalNumber('El costo'),
  categoryId: z.string().trim().optional().default(''),
};

export const createProductSchema = z.object(productFields);

export const updateProductSchema = z.object({
  ...productFields,
  productId: requiredText(64, 'El producto'),
  active: z.enum(['true', 'false'], { error: 'Elige un estado válido.' }).transform(
    (value) => value === 'true',
  ),
});

export const categorySchema = z.object({
  name: requiredText(120, 'El nombre de la categoría'),
});

export type CreateProductValues = z.infer<typeof createProductSchema>;
export type UpdateProductValues = z.infer<typeof updateProductSchema>;
export type CategoryValues = z.infer<typeof categorySchema>;

export type CatalogValidation =
  | { ok: true; action: 'product'; data: CreateProductValues }
  | { ok: true; action: 'product-update'; data: UpdateProductValues }
  | { ok: true; action: 'category'; data: CategoryValues }
  | { ok: false; message: string; fieldErrors: FieldErrors };

/** Convierte `FormData` en un objeto plano de cadenas (ignora archivos). */
export function formDataToObject(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

function parseWith<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; message: string; fieldErrors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    message: result.error.issues[0]?.message ?? 'Revisa los datos del formulario.',
    fieldErrors,
  };
}

/** Valida los valores de un formulario del catálogo según su acción. */
export function validateCatalogValues(
  action: CatalogFormAction,
  values: Record<string, unknown>,
): CatalogValidation {
  if (action === 'category') {
    const parsed = parseWith(categorySchema, values);
    return parsed.ok ? { ok: true, action, data: parsed.data } : parsed;
  }
  if (action === 'product-update') {
    const parsed = parseWith(updateProductSchema, values);
    return parsed.ok ? { ok: true, action, data: parsed.data } : parsed;
  }
  const parsed = parseWith(createProductSchema, values);
  return parsed.ok ? { ok: true, action: 'product', data: parsed.data } : parsed;
}

/** Valida el `FormData` recibido por el servidor. */
export function validateCatalogForm(
  action: CatalogFormAction,
  form: FormData,
): CatalogValidation {
  return validateCatalogValues(action, formDataToObject(form));
}
