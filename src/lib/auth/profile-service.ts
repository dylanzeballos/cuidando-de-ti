import { API_BASE_URL } from 'astro:env/server';
import { createProfileClient, type ProfileResult } from '@/lib/auth/profile-api';

/**
 * Carga el perfil con los roles y permisos efectivos de la sesión. En
 * desarrollo puede sustituirse por el fixture de identidad para trabajar sin
 * backend; en producción siempre consulta la API real.
 */
export async function loadAccessProfile(token: string): Promise<ProfileResult> {
  if (import.meta.env.DEV && process.env.IDENTITY_FIXTURE === 'true') {
    const { createIdentityFixtureClient } = await import('@/lib/admin/identity-fixture');
    const fixture = createIdentityFixtureClient();
    const result = await fixture.listRoles();
    return {
      status: 'ok',
      profile: {
        id: 'fixture',
        email: 'admin@acme.test',
        displayName: 'Administrador',
        roles: result.status === 'ok' ? result.data.map((role) => role.name) : [],
        permissions: result.status === 'ok'
          ? [...new Set(result.data.flatMap((role) => role.permissions))]
          : [],
      },
    };
  }

  const client = createProfileClient({ baseUrl: API_BASE_URL, token });
  return client.getProfile();
}
