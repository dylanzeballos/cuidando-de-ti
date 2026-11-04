import { API_BASE_URL } from 'astro:env/server';
import { createSalesClient, type SalesClient } from '@/lib/sales/sales-api';
import { createSalesFixtureClient, salesFixtureEnabled } from '@/lib/sales/fixtures';

/**
 * Resuelve el cliente de ventas. En producción siempre usa la API real con el
 * token de la sesión de servidor; el fixture local solo sustituye al contrato en
 * desarrollo y con activación explícita (`SALES_FIXTURE=true`), para poder
 * desarrollar sin el backend.
 */
export function resolveSalesClient(token: string): SalesClient {
  if (salesFixtureEnabled(import.meta.env.DEV, process.env.SALES_FIXTURE)) {
    return createSalesFixtureClient();
  }
  return createSalesClient({ baseUrl: API_BASE_URL, token });
}
