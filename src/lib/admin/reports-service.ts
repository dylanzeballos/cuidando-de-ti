import { API_BASE_URL } from 'astro:env/server';
import {
  createAdminClient,
  type Branch,
  type Category,
  type Product,
} from '@/lib/admin/catalog-api';
import type { ExpenseTotals, MarginEntry } from '@/lib/admin/reports-api';
import { createReportsClient } from '@/lib/admin/reports-api';
import type { ReportPeriod } from '@/lib/admin/reports';
import type { Sale } from '@/lib/sales/sales-api';
import { resolveSalesClient } from '@/lib/sales/sales-service';

export type ReportsData = {
  sales: Sale[];
  products: Product[];
  categories: Category[];
  branches: Branch[];
  margins: MarginEntry[];
  expenses: ExpenseTotals | null;
  previousExpenses: ExpenseTotals | null;
  stockByProduct: Record<string, number>;
  /** Algunas fuentes fallaron; la página muestra lo disponible y un aviso. */
  partial: boolean;
  messages: string[];
};

/** Cantidad máxima de productos a los que se consulta stock (evita N+1 alto). */
const STOCK_LOOKUP_LIMIT = 30;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoDate(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Carga en paralelo las fuentes que alimentan el panel de reportes. El token
 * vive solo en el servidor; el navegador nunca lo recibe. Ante el fallo de una
 * fuente se conserva el resto y se marca la carga como parcial.
 */
export async function loadReportsData(
  token: string,
  months: ReportPeriod,
): Promise<ReportsData> {
  const sales = resolveSalesClient(token);
  const catalog = createAdminClient({ baseUrl: API_BASE_URL, token });
  const reports = createReportsClient({ baseUrl: API_BASE_URL, token });

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months * 2 - 1), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const currentFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const previousFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousTo = new Date(now.getFullYear(), now.getMonth(), 0);

  const messages: string[] = [];

  const [
    salesResult,
    productsResult,
    categoriesResult,
    branchesResult,
    expensesResult,
    previousExpensesResult,
  ] = await Promise.all([
    sales.listSales({ from: from.toISOString(), to: to.toISOString(), size: 200 }),
    catalog.listProducts({ active: true }),
    catalog.listCategories(),
    catalog.listBranches(),
    reports.expenseTotals(isoDate(currentFrom), isoDate(currentTo)),
    reports.expenseTotals(isoDate(previousFrom), isoDate(previousTo)),
  ]);

  const salesList = salesResult.status === 'ok' ? salesResult.data.items : [];
  if (salesResult.status !== 'ok') messages.push(salesResult.message);

  const products = productsResult.status === 'ok' ? productsResult.data.items : [];
  if (productsResult.status !== 'ok') messages.push(productsResult.message);

  const categories = categoriesResult.status === 'ok' ? categoriesResult.data : [];
  if (categoriesResult.status !== 'ok') messages.push(categoriesResult.message);

  const branches = branchesResult.status === 'ok' ? branchesResult.data : [];
  if (branchesResult.status !== 'ok') messages.push(branchesResult.message);

  const expenses = expensesResult.status === 'ok' ? expensesResult.data : null;
  if (expensesResult.status !== 'ok') messages.push(expensesResult.message);

  const previousExpenses =
    previousExpensesResult.status === 'ok' ? previousExpensesResult.data : null;

  const branchId = branches[0]?.id;
  let margins: MarginEntry[] = [];
  const stockByProduct: Record<string, number> = {};

  if (branchId !== undefined) {
    const marginsPromise = reports.listMargins(branchId);
    await Promise.all(
      products.slice(0, STOCK_LOOKUP_LIMIT).map(async (product) => {
        const result = await catalog.getStock(branchId, product.id);
        if (result.status === 'ok') stockByProduct[product.id] = result.data.quantity;
      }),
    );

    const marginsResult = await marginsPromise;
    if (marginsResult.status === 'ok') {
      margins = marginsResult.data.items;
    } else {
      messages.push(marginsResult.message);
    }
  }

  return {
    sales: salesList,
    products,
    categories,
    branches,
    margins,
    expenses,
    previousExpenses,
    stockByProduct,
    partial: messages.length > 0,
    messages: [...new Set(messages)],
  };
}
