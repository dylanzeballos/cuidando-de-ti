import type { Sale } from '@/lib/sales/sales-api';
import type { Branch, Category, Product } from '@/lib/admin/catalog-api';
import type { ExpenseTotals, MarginEntry } from '@/lib/admin/reports-api';
import { paymentMethodLabel, round2 } from '@/lib/sales/cart';

/**
 * Agregaciones puras del panel de reportes. No consultan la API ni autorizan
 * nada: reciben lo que el servidor ya cargó y lo traducen a las series, KPIs y
 * tablas que la página presenta. Separarlas permite razonar y probar los
 * cálculos sin backend.
 */

export type ReportPeriod = 3 | 6 | 12;

export const REPORT_PERIODS: readonly ReportPeriod[] = [3, 6, 12];

/** Umbral de existencias para marcar un producto como stock bajo. */
export const LOW_STOCK_THRESHOLD = 10;

export type ReportInput = {
  sales: Sale[];
  products: Product[];
  categories: Category[];
  branches: Branch[];
  /** Márgenes vigentes que ya calculó el backend (solo productos con costo). */
  margins: MarginEntry[];
  expenses: ExpenseTotals | null;
  previousExpenses: ExpenseTotals | null;
  /** Existencias por producto en la sucursal principal. */
  stockByProduct: Record<string, number>;
  months: ReportPeriod;
  /** Inyectable para pruebas; por defecto, el momento actual. */
  now?: Date;
};

export type MonthlyPoint = {
  key: string;
  label: string;
  revenue: number;
  sales: number;
};

export type RankedItem = {
  id: string;
  label: string;
  value: number;
  detail: string;
};

export type ProductMarginRow = {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  cost: number;
  margin: number;
  marginPct: number | null;
  stock: number | null;
};

export type StockRow = {
  productId: string;
  sku: string;
  name: string;
  stock: number;
};

export type ReportStats = {
  revenue: number;
  previousRevenue: number;
  revenueDeltaPct: number | null;
  salesCount: number;
  annulledCount: number;
  averageTicket: number | null;
  catalogMarginPct: number | null;
  productsWithCost: number;
  activeProducts: number;
  expensesTotal: number;
  previousExpensesTotal: number;
  expensesDeltaPct: number | null;
  lowStockCount: number;
};

export type ReportView = {
  months: ReportPeriod;
  periodLabel: string;
  stats: ReportStats;
  monthly: MonthlyPoint[];
  paymentMix: RankedItem[];
  topProducts: RankedItem[];
  categoryMix: RankedItem[];
  marginRows: ProductMarginRow[];
  lowStock: StockRow[];
  expenseBreakdown: RankedItem[];
  expenseTotal: number;
  expenses: ExpenseTotals | null;
  branches: Branch[];
};

function startOfMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-BO', { month: 'short' }).format(date).replace('.', '');
}

function percentage(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return round2(((current - previous) / previous) * 100);
}

function completed(sales: readonly Sale[]): Sale[] {
  return sales.filter((sale) => sale.status === 'COMPLETED');
}

function inRange(sale: Sale, from: Date, to: Date): boolean {
  const created = new Date(sale.createdAt).getTime();
  return created >= from.getTime() && created < to.getTime();
}

/** Serie mensual de ingresos y número de ventas del periodo y del anterior. */
function buildMonthly(
  sales: readonly Sale[],
  months: number,
  now: Date,
): { current: MonthlyPoint[]; previous: MonthlyPoint[] } {
  const buckets = new Map<string, MonthlyPoint>();

  const makeBucket = (date: Date): MonthlyPoint => {
    const key = monthKey(date);
    return { key, label: monthLabel(date), revenue: 0, sales: 0 };
  };

  const current: MonthlyPoint[] = [];
  const previous: MonthlyPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const point = makeBucket(startOfMonth(now, -offset));
    current.push(point);
    buckets.set(point.key, point);
  }
  for (let offset = months * 2 - 1; offset >= months; offset -= 1) {
    const point = makeBucket(startOfMonth(now, -offset));
    previous.push(point);
    buckets.set(point.key, point);
  }

  for (const sale of completed(sales)) {
    const bucket = buckets.get(monthKey(new Date(sale.createdAt)));
    if (bucket === undefined) continue;
    bucket.revenue = round2(bucket.revenue + sale.total);
    bucket.sales += 1;
  }

  return { current, previous };
}

function buildPaymentMix(sales: readonly Sale[]): RankedItem[] {
  const totals = new Map<string, number>();
  let total = 0;
  for (const sale of completed(sales)) {
    for (const payment of sale.payments) {
      totals.set(payment.method, round2((totals.get(payment.method) ?? 0) + payment.amount));
      total = round2(total + payment.amount);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([method, value]) => ({
      id: method,
      label: paymentMethodLabel(method),
      value,
      detail: total > 0 ? `${Math.round((value / total) * 100)}% del cobrado` : '',
    }));
}

function buildTopProducts(sales: readonly Sale[], products: readonly Product[]): RankedItem[] {
  const names = new Map(products.map((product) => [product.id, product.name]));
  const totals = new Map<string, { value: number; quantity: number }>();

  for (const sale of completed(sales)) {
    for (const item of sale.items) {
      const current = totals.get(item.productId) ?? { value: 0, quantity: 0 };
      totals.set(item.productId, {
        value: round2(current.value + item.lineTotal),
        quantity: current.quantity + item.quantity,
      });
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 6)
    .map(([productId, entry]) => ({
      id: productId,
      label: names.get(productId) ?? 'Producto',
      value: entry.value,
      detail: `${entry.quantity} ${entry.quantity === 1 ? 'unidad' : 'unidades'}`,
    }));
}

function buildCategoryMix(
  sales: readonly Sale[],
  products: readonly Product[],
  categories: readonly Category[],
): RankedItem[] {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const productCategory = new Map(products.map((product) => [product.id, product.categoryId]));
  const totals = new Map<string, number>();

  for (const sale of completed(sales)) {
    for (const item of sale.items) {
      const categoryId = productCategory.get(item.productId) ?? null;
      const key = categoryId ?? 'sin-categoria';
      totals.set(key, round2((totals.get(key) ?? 0) + item.lineTotal));
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      id: key,
      label: key === 'sin-categoria' ? 'Sin categoría' : (categoryName.get(key) ?? 'Categoría'),
      value,
      detail: '',
    }));
}

function buildMarginRows(
  margins: readonly MarginEntry[],
  stockByProduct: Record<string, number>,
): ProductMarginRow[] {
  const unique = new Map<string, ProductMarginRow>();
  for (const margin of margins) {
    if (unique.has(margin.productId)) continue;
    unique.set(margin.productId, {
      productId: margin.productId,
      sku: margin.sku,
      name: margin.name,
      unitPrice: margin.unitPrice,
      cost: margin.costPrice,
      margin: margin.marginAmount,
      marginPct: margin.marginPercent,
      stock: Object.prototype.hasOwnProperty.call(stockByProduct, margin.productId)
        ? stockByProduct[margin.productId]
        : null,
    });
  }
  return [...unique.values()].sort((a, b) => b.margin - a.margin);
}

function buildLowStock(
  products: readonly Product[],
  stockByProduct: Record<string, number>,
): StockRow[] {
  return products
    .filter(
      (product) =>
        Object.prototype.hasOwnProperty.call(stockByProduct, product.id) &&
        stockByProduct[product.id] <= LOW_STOCK_THRESHOLD,
    )
    .map((product) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      stock: stockByProduct[product.id],
    }))
    .sort((a, b) => a.stock - b.stock);
}

/**
 * Construye la vista completa del panel a partir de los datos ya cargados.
 * Es pura y determinista salvo por `now`, que se puede inyectar.
 */
export function buildReportView(input: ReportInput): ReportView {
  const now = input.now ?? new Date();
  const currentStart = startOfMonth(now, -(input.months - 1));
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthly = buildMonthly(input.sales, input.months, now);
  const currentSales = completed(input.sales).filter((sale) =>
    inRange(sale, currentStart, nextStart),
  );

  const revenue = round2(currentSales.reduce((sum, sale) => sum + sale.total, 0));
  const previousRevenue = round2(
    monthly.previous.reduce((sum, point) => sum + point.revenue, 0),
  );
  const annulledCount = input.sales.filter(
    (sale) => sale.status === 'ANNULLED' && inRange(sale, currentStart, nextStart),
  ).length;

  const marginRows = buildMarginRows(input.margins, input.stockByProduct);
  const activeProducts = input.products.filter((product) => product.active).length;
  const priced = marginRows.filter((row) => row.unitPrice > 0);
  const catalogMarginPct =
    marginRows.length === 0
      ? null
      : round2(
          (marginRows.reduce((sum, row) => sum + row.margin, 0) /
            Math.max(marginRows.reduce((sum, row) => sum + row.unitPrice, 0), 0.01)) *
            100,
        );
  const lowStock = buildLowStock(input.products, input.stockByProduct);

  const expensesTotal = input.expenses?.total ?? 0;
  const previousExpensesTotal = input.previousExpenses?.total ?? 0;
  const expenseBreakdown: RankedItem[] = (input.expenses?.byCategory ?? []).map((entry) => ({
    id: entry.category,
    label: entry.category,
    value: entry.total,
    detail: '',
  }));

  return {
    months: input.months,
    periodLabel: `últimos ${input.months} meses`,
    stats: {
      revenue,
      previousRevenue,
      revenueDeltaPct: percentage(revenue, previousRevenue),
      salesCount: currentSales.length,
      annulledCount,
      averageTicket:
        currentSales.length === 0 ? null : round2(revenue / currentSales.length),
      catalogMarginPct,
      productsWithCost: priced.length,
      activeProducts,
      expensesTotal,
      previousExpensesTotal,
      expensesDeltaPct: percentage(expensesTotal, previousExpensesTotal),
      lowStockCount: lowStock.length,
    },
    monthly: monthly.current,
    paymentMix: buildPaymentMix(currentSales),
    topProducts: buildTopProducts(currentSales, input.products),
    categoryMix: buildCategoryMix(currentSales, input.products, input.categories),
    marginRows,
    lowStock,
    expenseBreakdown,
    expenseTotal: expensesTotal,
    expenses: input.expenses,
    branches: input.branches,
  };
}
