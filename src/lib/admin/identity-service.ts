import { API_BASE_URL } from 'astro:env/server';
import { createIdentityClient, type IdentityClient } from '@/lib/admin/identity-api';
import { createIdentityFixtureClient, fixtureEnabled } from '@/lib/admin/identity-fixture';

/**
 * Resuelve el cliente de administración de identidad. En producción siempre usa
 * la API real con el token de la sesión de servidor; el fixture local solo
 * sustituye al contrato en desarrollo y con activación explícita
 * (`IDENTITY_FIXTURE=true`), para poder desarrollar sin el backend.
 */
export function resolveIdentityClient(token: string): IdentityClient {
  if (fixtureEnabled(import.meta.env.DEV, process.env.IDENTITY_FIXTURE)) {
    return createIdentityFixtureClient();
  }
  return createIdentityClient({ baseUrl: API_BASE_URL, token });
}
