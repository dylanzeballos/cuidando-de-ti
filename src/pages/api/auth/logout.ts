import type { APIRoute } from 'astro';
import { API_BASE_URL } from 'astro:env/server';
import { createAuthClient } from '@/lib/auth/auth-api';

export const prerender = false;

export const POST: APIRoute = async ({ session }) => {
  const auth = await session?.get('auth');

  if (auth) {
    // Revoca el token de refresco (mejor esfuerzo: el cierre local siempre procede).
    const client = createAuthClient({ baseUrl: API_BASE_URL });
    await client.logout(auth.refreshToken);
  }

  // Invalida la sesión de servidor antes de redirigir.
  session?.destroy();

  return new Response(null, { status: 303, headers: { location: '/entrar' } });
};
