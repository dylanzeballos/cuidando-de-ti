import type { Product } from '@/lib/admin/catalog-api';
import type { CostMargin } from '@/lib/admin/costs-live-api';

export type MarginStatus = 'todos' | 'con-costo' | 'sin-costo' | 'negativo';

export type CostRow = {
  product: Product;
  margin: CostMargin | null;
};

export type CostMetrics = {
  products: number;
  withCost: number;
  withoutCost: number;
  averageMarginPercent: number | null;
};

export function parseMarginStatus(value: string | null): MarginStatus {
  if (value === 'con-costo' || value === 'sin-costo' || value === 'negativo') return value;
  return 'todos';
}

/** Une el catálogo con los márgenes vigentes de la sucursal. */
export function buildCostRows(
  products: readonly Product[],
  margins: readonly CostMargin[],
): CostRow[] {
  const byProduct = new Map(margins.map((margin) => [margin.productId, margin]));
  return products.map((product) => ({ product, margin: byProduct.get(product.id) ?? null }));
}

export function filterCostRows(
  rows: readonly CostRow[],
  query: string,
  status: MarginStatus,
): CostRow[] {
  const term = query.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesQuery =
      term.length === 0 ||
      row.product.name.toLowerCase().includes(term) ||
      row.product.sku.toLowerCase().includes(term);
    if (!matchesQuery) return false;
    if (status === 'con-costo') return row.margin !== null;
    if (status === 'sin-costo') return row.margin === null;
    if (status === 'negativo') return row.margin !== null && row.margin.marginAmount < 0;
    return true;
  });
}

export function costMetrics(rows: readonly CostRow[]): CostMetrics {
  const withCost = rows.filter((row) => row.margin !== null).length;
  const percents = rows
    .map((row) => row.margin?.marginPercent)
    .filter((value): value is number => value !== null && value !== undefined);
  const average =
    percents.length === 0
      ? null
      : percents.reduce((sum, value) => sum + value, 0) / percents.length;
  return {
    products: rows.length,
    withCost,
    withoutCost: rows.length - withCost,
    averageMarginPercent: average,
  };
}

export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'ARRIENDO',
  'SERVICIOS',
  'SUELDOS',
  'INSUMOS',
  'MANTENIMIENTO',
  'TRANSPORTE',
  'OTROS',
];

export type ExpenseMetrics = {
  total: number;
  count: number;
  average: number;
  categories: number;
};

export function expenseMetrics(
  total: number,
  count: number,
  categories: number,
): ExpenseMetrics {
  return {
    total,
    count,
    average: count > 0 ? total / count : 0,
    categories,
  };
}
