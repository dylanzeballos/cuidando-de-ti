import type { APIRoute } from 'astro';
import { API_BASE_URL } from 'astro:env/server';
import { canAccessPath, firstAllowedRoute } from '@/lib/admin/access';
import { createAuthClient } from '@/lib/auth/auth-api';
import { loadAccessProfile } from '@/lib/auth/profile-service';

export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Solo rutas internas de administración; evita redirecciones abiertas. */
function safeRedirect(value: string | null): string {
  if (typeof value === 'string' && value.startsWith('/admin') && !value.startsWith('//')) {
    return value;
  }
  return '/admin';
}

function back(params: Record<string, string>): Response {
  const search = new URLSearchParams(params);
  return new Response(null, { status: 303, headers: { location: `/entrar?${search.toString()}` } });
}

export const POST: APIRoute = async ({ request, session }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const target = safeRedirect(String(form.get('redirect') ?? '') || null);

  // Validación en servidor antes de llamar a la API.
  if (email.length === 0) return back({ error: 'email' });
  if (!EMAIL.test(email)) return back({ error: 'email', email });
  if (password.length === 0) return back({ error: 'password', email });

  const auth = createAuthClient({ baseUrl: API_BASE_URL });
  const result = await auth.login(email, password);

  if (result.status === 'invalid') return back({ error: 'invalid', email });
  if (result.status === 'unavailable') return back({ error: 'unavailable', email });

  if (session === undefined) return back({ error: 'unavailable', email });

  // La sesión de servidor guarda identidad y tokens; el navegador solo recibe la cookie.
  session.set('auth', {
    accountEmail: email,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresAt: Date.now() + result.tokens.expiresIn * 1000,
  });

  // Si la cuenta no puede ver la ruta solicitada, se la lleva a su primera
  // sección disponible. El backend sigue siendo la autoridad final.
  const profile = await loadAccessProfile(result.tokens.accessToken);
  const targetPath = target.split('?')[0] ?? target;
  const destination =
    profile.status === 'ok' && !canAccessPath(targetPath, profile.profile.permissions)
      ? firstAllowedRoute(profile.profile.permissions)
      : target;

  return new Response(null, { status: 303, headers: { location: destination } });
};
