import { parseSiteConfig, type SiteLookup } from '@/lib/site-contract';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type SiteClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Inyectable para pruebas. Por defecto, el `fetch` global. */
  fetchImpl?: FetchLike;
  /** Tiempo máximo de espera por petición, en milisegundos. */
  timeoutMs?: number;
};

function joinUrl(baseUrl: string, path: string): URL | null {
  try {
    return new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);
  } catch {
    return null;
  }
}

/**
 * Cliente servidor para `GET /api/v1/public/site?domain=`.
 * Nunca lanza: devuelve un estado seguro que la página traduce a 200, 404 o 503.
 */
export function createSiteClient(options: SiteClientOptions) {
  const { baseUrl, fetchImpl = fetch, timeoutMs = 5000 } = options;

  async function getSite(domain: string): Promise<SiteLookup> {
    const url = joinUrl(baseUrl, '/public/site');
    if (url === null) return { status: 'unavailable' };
    url.searchParams.set('domain', domain);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
    } catch {
      return { status: 'unavailable' };
    } finally {
      clearTimeout(timer);
    }

    // Dominio desconocido, no registrado o mal formado: página neutra.
    if (response.status === 400 || response.status === 404) {
      return { status: 'not-found' };
    }
    // 5xx u otros errores: fallo temporal, sin reutilizar datos de otro dominio.
    if (!response.ok) {
      return { status: 'unavailable' };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: 'unavailable' };
    }

    const site = parseSiteConfig(payload);
    return site === null ? { status: 'unavailable' } : { status: 'ok', site };
  }

  return { getSite };
}

export type SiteClient = ReturnType<typeof createSiteClient>;
