import { describe, expect, it } from 'vitest';
import { createSiteClient } from '@/lib/site-client';
import {
  failingFetch,
  fixtureFetch,
  hangingFetch,
  staticFetch,
} from '@/lib/fixtures';

const BASE_URL = 'http://backend.test/api/v1';

describe('createSiteClient', () => {
  it('aísla dos dominios con marca y módulos diferentes', async () => {
    const client = createSiteClient({ baseUrl: BASE_URL, fetchImpl: fixtureFetch() });

    const acme = await client.getSite('acme.test');
    const northwind = await client.getSite('northwind.test');

    expect(acme.status).toBe('ok');
    expect(northwind.status).toBe('ok');
    if (acme.status !== 'ok' || northwind.status !== 'ok') return;

    expect(acme.site.siteName).toBe('Acme Industrial');
    expect(acme.site.modules).toEqual(['commerce', 'billing']);
    expect(northwind.site.siteName).toBe('Northwind');
    expect(northwind.site.modules).toEqual(['crm']);

    // Ningún dominio reutiliza la configuración del otro.
    expect(acme.site.modules).not.toContain('crm');
    expect(northwind.site.modules).not.toContain('commerce');
    expect(acme.site.theme.primary).not.toBe(northwind.site.theme.primary);
  });

  it('devuelve not-found para un dominio desconocido', async () => {
    const client = createSiteClient({ baseUrl: BASE_URL, fetchImpl: fixtureFetch() });
    expect(await client.getSite('desconocido.test')).toEqual({ status: 'not-found' });
  });

  it('devuelve not-found para un 400 (dominio mal formado)', async () => {
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: staticFetch({ title: 'Bad request' }, 400),
    });
    expect(await client.getSite('acme.test')).toEqual({ status: 'not-found' });
  });

  it('rechaza una respuesta 200 con forma o colores inválidos', async () => {
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: staticFetch({
        siteName: 'Acme',
        description: 'Desc',
        theme: { primary: 'expression(alert(1))', background: '#fff', foreground: '#111' },
        modules: [],
      }),
    });
    expect(await client.getSite('acme.test')).toEqual({ status: 'unavailable' });
  });

  it('rechaza una respuesta 200 que no es JSON válido', async () => {
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: async () =>
        new Response('<html>no soy json</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    });
    expect(await client.getSite('acme.test')).toEqual({ status: 'unavailable' });
  });

  it('devuelve unavailable cuando el backend está caído', async () => {
    const client = createSiteClient({ baseUrl: BASE_URL, fetchImpl: failingFetch });
    expect(await client.getSite('acme.test')).toEqual({ status: 'unavailable' });
  });

  it('devuelve unavailable ante un 5xx', async () => {
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: staticFetch({ title: 'Unavailable' }, 503),
    });
    expect(await client.getSite('acme.test')).toEqual({ status: 'unavailable' });
  });

  it('devuelve unavailable cuando se agota el tiempo de espera', async () => {
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: hangingFetch,
      timeoutMs: 10,
    });
    expect(await client.getSite('acme.test')).toEqual({ status: 'unavailable' });
  });

  it('construye la consulta con el dominio como parámetro', async () => {
    const calls: URL[] = [];
    const client = createSiteClient({
      baseUrl: BASE_URL,
      fetchImpl: async (input) => {
        calls.push(new URL(String(input)));
        return new Response('{}', { status: 404 });
      },
    });
    await client.getSite('acme.test');
    expect(calls[0]?.pathname).toBe('/api/v1/public/site');
    expect(calls[0]?.searchParams.get('domain')).toBe('acme.test');
  });
});
