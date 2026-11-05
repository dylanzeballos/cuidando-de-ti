import { API_BASE_URL } from 'astro:env/server';
import { createAuthClient } from '@/lib/auth/auth-api';

/**
 * Ciclo de vida de la sesión BFF. El access token del backend dura pocos
 * minutos; antes de caducar se renueva con el refresh token y se rota la
 * sesión de servidor. El navegador nunca ve ninguno de los dos.
 */

export type SessionAuth = App.SessionData['auth'];

/** Se renueva con este margen antes de que el token caduque. */
export const REFRESH_MARGIN_MS = 60_000;

export type RefreshOutcome =
  | { status: 'ok'; auth: SessionAuth }
  | { status: 'expired' }
  | { status: 'unavailable' };

/** Indica si el access token está por caducar (o ya caducó). */
export function needsRefresh(auth: SessionAuth, now: number = Date.now()): boolean {
  return now >= auth.expiresAt - REFRESH_MARGIN_MS;
}

/**
 * Renueva el access token con el refresh token de la sesión. El backend rota el
 * refresh token en cada renovación, por lo que el llamador debe guardar el
 * resultado completo en la sesión. Un refresh inválido o revocado significa que
 * la sesión ya no sirve; un fallo de red es temporal.
 */
export async function refreshSessionAuth(auth: SessionAuth): Promise<RefreshOutcome> {
  if (auth.refreshToken.length === 0) return { status: 'expired' };

  const client = createAuthClient({ baseUrl: API_BASE_URL });
  const result = await client.refresh(auth.refreshToken);

  if (result.status === 'ok') {
    return {
      status: 'ok',
      auth: {
        accountEmail: auth.accountEmail,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresAt: Date.now() + result.tokens.expiresIn * 1000,
      },
    };
  }

  if (result.status === 'invalid') return { status: 'expired' };
  return { status: 'unavailable' };
}
