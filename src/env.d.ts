/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Empresa de la instalación, deducida en el servidor. Nunca proviene de
     * `query`, `body` ni de datos del navegador. `status` distingue el fallo
     * temporal de la API de una empresa sin configuración publicada.
     */
    empresa: {
      name: string | null;
      modules: string[];
      status: 'ok' | 'unavailable';
    } | null;
    /** Cuenta autenticada de la sesión de servidor. */
    account: { email: string } | null;
  }

  interface SessionData {
    /** Identidad y tokens. Viven solo en el servidor; el navegador ve una cookie `HttpOnly`. */
    auth: {
      accountEmail: string;
      accessToken: string;
      refreshToken: string;
      /** Marca de tiempo (epoch ms) en que caduca el token de acceso. */
      expiresAt: number;
    };
  }
}
