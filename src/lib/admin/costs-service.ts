import { API_BASE_URL } from 'astro:env/server';
import { createCostsClient, type CostsClient } from '@/lib/admin/costs-api';
import { costsFixtureEnabled, createCostsFixtureClient } from '@/lib/admin/costs-fixture';

/**
 * Resuelve el cliente de costos y gastos. En producción siempre usa la API real
 * con el token y la empresa de la sesión de servidor; el fixture local solo
 * sustituye al contrato en desarrollo y con activación explícita
 * (`COSTS_FIXTURE=true`), para poder desarrollar sin el backend.
 */
export function resolveCostsClient(token: string, empresa: string): CostsClient {
  if (costsFixtureEnabled(import.meta.env.DEV, process.env.COSTS_FIXTURE)) {
    return createCostsFixtureClient();
  }
  return createCostsClient({ baseUrl: API_BASE_URL, token, empresa });
}
