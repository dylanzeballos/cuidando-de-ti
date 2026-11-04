import { defineMiddleware } from 'astro:middleware';
import { loadSite } from '@/lib/site-service';

/**
 * Protege `/admin/**` con la sesión de servidor y adjunta la empresa de la
 * instalación a `Astro.locals`. La empresa se deduce en el servidor (config
 * pública de la instalación), nunca de `query` ni `body`. Las rutas de sesión y
 * administración no se cachean y no se indexan.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSessionRoute = pathname === '/entrar' || pathname.startsWith('/api/auth');

  if (isAdmin) {
    const auth = await context.session?.get('auth');

    if (!auth) {
      const target = `/entrar?redirect=${encodeURIComponent(`${pathname}${context.url.search}`)}`;
      return context.redirect(target, 303);
    }

    context.locals.account = { email: auth.accountEmail };

    const lookup = await loadSite(context.url.hostname);
    context.locals.empresa =
      lookup.status === 'ok'
        ? { name: lookup.site.siteName, modules: lookup.site.modules, status: 'ok' }
        : { name: null, modules: [], status: 'unavailable' };
  }

  const response = await next();

  if (isAdmin || isSessionRoute) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }

  return response;
});
