import { defineMiddleware } from 'astro:middleware';
import { canAccessPath } from '@/lib/admin/access';
import { loadAccessProfile } from '@/lib/auth/profile-service';
import { needsRefresh, refreshSessionAuth } from '@/lib/auth/session';
import { loadSite } from '@/lib/site-service';

/**
 * Protege `/admin/**` con la sesión de servidor, renueva el access token antes
 * de que caduque y adjunta la empresa de la instalación a `Astro.locals`. La
 * empresa se deduce en el servidor (configuración pública de la instalación),
 * nunca de `query` ni `body`. Las rutas de sesión y administración no se
 * cachean y no se indexan.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSessionRoute = pathname === '/entrar' || pathname.startsWith('/api/auth');

  if (isAdmin) {
    let auth = await context.session?.get('auth');

    if (!auth) {
      const target = `/entrar?redirect=${encodeURIComponent(`${pathname}${context.url.search}`)}`;
      return context.redirect(target, 303);
    }

    // El access token caduca pronto: se renueva y se rota la sesión antes de
    // que las páginas lo usen contra la API.
    if (context.session && needsRefresh(auth)) {
      const outcome = await refreshSessionAuth(auth);

      if (outcome.status === 'ok') {
        auth = outcome.auth;
        context.session.set('auth', auth);
      } else if (outcome.status === 'expired') {
        await context.session.destroy();
        return context.redirect('/entrar?error=session', 303);
      }
      // `unavailable`: se conserva la sesión y la página muestra su error de
      // disponibilidad; no se cierra una sesión válida por un fallo temporal.
    }

    context.locals.account = { email: auth.accountEmail };

    // La empresa define los módulos habilitados y el perfil define los permisos
    // efectivos de la cuenta. Ambos se resuelven en paralelo en el servidor.
    const [lookup, profileResult] = await Promise.all([
      loadSite(context.url.hostname),
      loadAccessProfile(auth.accessToken),
    ]);

    context.locals.empresa =
      lookup.status === 'ok'
        ? { name: lookup.site.siteName, modules: lookup.site.modules, status: 'ok' }
        : { name: null, modules: [], status: 'unavailable' };

    if (profileResult.status === 'ok') {
      context.locals.access = {
        roles: profileResult.profile.roles,
        permissions: profileResult.profile.permissions,
      };
    } else if (profileResult.status === 'unauthorized') {
      await context.session?.destroy();
      return context.redirect('/entrar?error=session', 303);
    } else {
      // Sin perfil no se puede saber qué opciones mostrar ni qué rutas permitir.
      // Se falla cerrado para no exhibir secciones no autorizadas.
      context.locals.access = null;
      const unavailable = context.redirect('/sin-acceso?motivo=perfil', 303);
      unavailable.headers.set('Cache-Control', 'no-store');
      unavailable.headers.set('X-Robots-Tag', 'noindex');
      return unavailable;
    }

    const { permissions } = context.locals.access;
    if (!canAccessPath(pathname, permissions)) {
      const denied = context.redirect('/sin-acceso', 303);
      denied.headers.set('Cache-Control', 'no-store');
      denied.headers.set('X-Robots-Tag', 'noindex');
      return denied;
    }
  }

  const response = await next();

  if (isAdmin || isSessionRoute) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }

  return response;
});
