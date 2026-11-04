import { API_BASE_URL, DEV_SITE_DOMAIN } from 'astro:env/server';
import { createSiteClient } from '@/lib/site-client';
import { fixtureFetch } from '@/lib/fixtures';
import { resolveRequestDomain, type SiteLookup } from '@/lib/site-contract';

/**
 * Fixture local del contrato de sitio (marca y módulos). En producción se ignora
 * siempre: solo sustituye al backend en desarrollo y con activación explícita
 * (`SITE_FIXTURE=true`), para ver la marca y los módulos sin backend.
 */
const useSiteFixture = import.meta.env.DEV && process.env.SITE_FIXTURE === 'true';

const client = createSiteClient({
  baseUrl: API_BASE_URL,
  ...(useSiteFixture ? { fetchImpl: fixtureFetch() } : {}),
});

/** Resuelve el dominio de consulta a partir del hostname de la petición. */
export function resolveHostname(hostname: string | null | undefined): string | null {
  return resolveRequestDomain(hostname, {
    devDomain: DEV_SITE_DOMAIN,
    isDev: import.meta.env.DEV,
  });
}

/** Consulta la configuración pública de la empresa para el hostname dado. */
export async function loadSite(hostname: string | null | undefined): Promise<SiteLookup> {
  const domain = resolveHostname(hostname);
  if (domain === null) return { status: 'not-found' };
  return client.getSite(domain);
}
