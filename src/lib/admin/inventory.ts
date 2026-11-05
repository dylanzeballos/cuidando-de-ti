import type { Product } from '@/lib/admin/catalog-api';

/** Umbral de existencias para marcar un producto como stock bajo. */
export const LOW_STOCK_THRESHOLD = 10;

export type StockStatus = 'sin-registro' | 'agotado' | 'bajo' | 'disponible';
export type StockFilter = 'todos' | StockStatus;

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  'sin-registro': 'Sin registro',
  agotado: 'Agotado',
  bajo: 'Stock bajo',
  disponible: 'Disponible',
};

export const STOCK_STATUS_BADGE: Record<StockStatus, string> = {
  'sin-registro': 'adm-chip',
  agotado: 'adm-badge adm-badge--danger',
  bajo: 'adm-badge adm-badge--warn',
  disponible: 'adm-badge adm-badge--on',
};

export function parseStockFilter(value: string | null): StockFilter {
  if (value === 'bajo' || value === 'agotado' || value === 'disponible' || value === 'sin-registro') {
    return value;
  }
  return 'todos';
}

export function stockStatus(
  quantity: number | undefined,
  threshold: number = LOW_STOCK_THRESHOLD,
): StockStatus {
  if (quantity === undefined) return 'sin-registro';
  if (quantity <= 0) return 'agotado';
  if (quantity <= threshold) return 'bajo';
  return 'disponible';
}

function matchesStatus(status: StockStatus, filter: StockFilter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'bajo') return status === 'bajo' || status === 'agotado';
  return status === filter;
}

/** Filtra productos por texto (nombre/SKU) y estado de existencias. */
export function filterStockProducts(
  products: readonly Product[],
  stockByProduct: Map<string, number>,
  query: string,
  filter: StockFilter,
  threshold: number = LOW_STOCK_THRESHOLD,
): Product[] {
  const term = query.trim().toLowerCase();
  return products.filter((product) => {
    const matchesQuery =
      term.length === 0 ||
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term);
    if (!matchesQuery) return false;
    return matchesStatus(stockStatus(stockByProduct.get(product.id), threshold), filter);
  });
}

export function countLowStock(
  products: readonly Product[],
  stockByProduct: Map<string, number>,
  threshold: number = LOW_STOCK_THRESHOLD,
): number {
  return products.filter((product) => {
    const status = stockStatus(stockByProduct.get(product.id), threshold);
    return status === 'bajo' || status === 'agotado';
  }).length;
}

export function countUnregistered(
  products: readonly Product[],
  stockByProduct: Map<string, number>,
): number {
  return products.filter((product) => stockStatus(stockByProduct.get(product.id)) === 'sin-registro')
    .length;
}
