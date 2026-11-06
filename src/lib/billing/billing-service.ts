import { API_BASE_URL } from 'astro:env/server';
import { createBillingClient, type BillingClient } from '@/lib/billing/billing-api';

/** Cliente fiscal de servidor; reutiliza la sesi�n BFF y la API hermana. */
export function resolveBillingClient(token: string): BillingClient {
  return createBillingClient({ baseUrl: API_BASE_URL, token });
}
