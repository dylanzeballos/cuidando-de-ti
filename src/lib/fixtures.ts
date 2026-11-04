import type { FetchLike } from '@/lib/site-client';

/**
 * Fixtures del contrato `tenant-site-v1` para dos dominios con marca y módulos
 * diferentes. Se usan para probar el cliente sin depender del backend real.
 */
export const RAW_SITES: Record<string, unknown> = {
  'cuidando-de-ti.test': {
    siteName: 'Cuidando de Ti',
    description: 'Farmacia: catálogo, inventario, ventas, caja, costos e identidad.',
    theme: { primary: '#0d9488', background: '#ffffff', foreground: '#0f1f1c' },
    modules: ['catalog', 'inventory', 'sales', 'costs', 'identity', 'billing', 'crm'],
  },
  'acme.test': {
    siteName: 'Acme Industrial',
    description: 'Soluciones industriales de Acme',
    theme: { primary: '#1f5135', background: '#f8f8f6', foreground: '#18221d' },
    modules: ['commerce', 'billing'],
  },
  'northwind.test': {
    siteName: 'Northwind',
    description: 'Comercio y clientes de Northwind',
    theme: { primary: '#1d4ed8', background: '#ffffff', foreground: '#0f172a' },
    modules: ['crm'],
  },
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Responde según el parámetro `domain`, con 404 para dominios desconocidos. */
export function fixtureFetch(): FetchLike {
  return async (input) => {
    const url = new URL(String(input));
    const domain = url.searchParams.get('domain');
    const site = domain === null ? undefined : RAW_SITES[domain];
    if (site === undefined) {
      return jsonResponse({ title: 'Not found' }, 404);
    }
    return jsonResponse(site, 200);
  };
}

/** Devuelve siempre el mismo cuerpo y estado, para respuestas inválidas. */
export function staticFetch(body: unknown, status = 200): FetchLike {
  return async () => jsonResponse(body, status);
}

/** Simula un backend caído o un error de red. */
export const failingFetch: FetchLike = async () => {
  throw new TypeError('fetch failed');
};

/** Simula una petición que nunca responde hasta ser abortada. */
export const hangingFetch: FetchLike = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
  });
