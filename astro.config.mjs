import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Patrones de hostname que este despliegue confía como Host / X-Forwarded-Host.
// Sin patrones, Astro ignora la cabecera y cae a 'localhost', por lo que la
// resolución por dominio no funcionaría. Los operadores deben incluir aquí sus
// dominios de empresa o comodines (por ejemplo `*.tu-dominio.com`).
const allowedDomains = (process.env.SITE_ALLOWED_DOMAINS ?? 'localhost,127.0.0.1')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((hostname) => ({ hostname }));

export default defineConfig({
  output: 'server',
  // El panel de desarrollo de Astro tapa contenido en móvil; se usa el del navegador.
  devToolbar: { enabled: false },
  adapter: node({ mode: 'standalone' }),
  security: { allowedDomains },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  // Sesión BFF: el navegador solo recibe una cookie de sesión; los tokens viven
  // en el servidor. El adaptador de Node provee el driver de sistema de archivos
  // por defecto (configurable a Redis para varias instancias). `httpOnly` es
  // fijo en Astro y no se puede desactivar.
  session: {
    cookie: {
      name: 'cuidando_session',
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  env: {
    schema: {
      // URL privada del backend hermano. Nunca se expone con PUBLIC_.
      API_BASE_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:8080/api/v1',
      }),
      // Dominio a resolver cuando se accede por localhost/127.0.0.1 en desarrollo.
      DEV_SITE_DOMAIN: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
    },
  },
});
