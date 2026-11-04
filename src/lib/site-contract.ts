/**
 * Contrato público `tenant-site-v1` entre plataforma-core-api y plataforma-web.
 * Ver ../plataforma-core-api/docs/contracts/tenant-site-v1.md.
 *
 * Las funciones de este módulo son puras y no dependen de `astro:env`, por lo que
 * se pueden probar con fixtures.
 */

export type SiteTheme = {
  primary: string;
  background: string;
  foreground: string;
};

export type SiteConfig = {
  siteName: string;
  description: string;
  theme: SiteTheme;
  /** Códigos de módulos públicos habilitados. Solo controlan presentación. */
  modules: string[];
};

export type SiteLookup =
  | { status: 'ok'; site: SiteConfig }
  | { status: 'not-found' }
  | { status: 'unavailable' };

/** Color hexadecimal seguro (`#rgb` o `#rrggbb`). Evita inyectar CSS arbitrario. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** Código de módulo público. */
const MODULE_CODE = /^[a-z0-9](?:[a-z0-9_-]{0,31})$/;
/** Hostname normalizado (etiquetas separadas por puntos, sin punto final). */
const HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

const MAX_SITE_NAME = 120;
const MAX_DESCRIPTION = 400;
const MAX_MODULES = 32;
const MAX_HOSTNAME = 253;

export function isSafeColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  let digits = hex.replace('#', '');
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((character) => character + character)
      .join('');
  }
  const value = Number.parseInt(digits, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(linearChannel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Relación de contraste WCAG entre dos colores hexadecimales (1..21).
 * Devuelve `null` si alguno no es un color válido.
 */
export function contrastRatio(first: string, second: string): number | null {
  if (!isSafeColor(first) || !isSafeColor(second)) return null;
  const luminanceA = relativeLuminance(hexToRgb(first.trim()));
  const luminanceB = relativeLuminance(hexToRgb(second.trim()));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contraste mínimo para texto normal (WCAG AA). */
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Normaliza un hostname: minúsculas, sin esquema, sin puerto y sin punto final.
 * Devuelve `null` si el valor no es un hostname válido.
 */
export function normalizeHostname(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  let host = raw.trim().toLowerCase();
  if (host.length === 0) return null;

  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  }

  // Quita puerto (`host:8080`) y corchetes de IPv6 no soportados aquí.
  if (host.startsWith('[')) return null;
  const portSeparator = host.indexOf(':');
  if (portSeparator !== -1) host = host.slice(0, portSeparator);

  host = host.replace(/\.$/, '');
  if (host.length === 0 || host.length > MAX_HOSTNAME) return null;
  if (!HOSTNAME.test(host)) return null;

  return host;
}

function parseString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function parseTheme(value: unknown): SiteTheme | null {
  if (typeof value !== 'object' || value === null) return null;
  const theme = value as Record<string, unknown>;
  if (!isSafeColor(theme.primary) || !isSafeColor(theme.background) || !isSafeColor(theme.foreground)) {
    return null;
  }
  const parsed: SiteTheme = {
    primary: theme.primary.trim(),
    background: theme.background.trim(),
    foreground: theme.foreground.trim(),
  };

  // Contraste suficiente para el texto (foreground) y para los acentos y el
  // botón (primary) sobre el fondo. Una combinación insegura se rechaza.
  const textContrast = contrastRatio(parsed.foreground, parsed.background);
  const accentContrast = contrastRatio(parsed.primary, parsed.background);
  if (
    textContrast === null ||
    accentContrast === null ||
    textContrast < MIN_TEXT_CONTRAST ||
    accentContrast < MIN_TEXT_CONTRAST
  ) {
    return null;
  }

  return parsed;
}

function parseModules(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_MODULES) return null;
  const modules: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !MODULE_CODE.test(entry)) return null;
    if (!modules.includes(entry)) modules.push(entry);
  }
  return modules;
}

/**
 * Valida y normaliza la respuesta 200 del contrato. Devuelve `null` si la forma,
 * los textos o los colores no son seguros de renderizar.
 */
export function parseSiteConfig(value: unknown): SiteConfig | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;

  const siteName = parseString(payload.siteName, MAX_SITE_NAME);
  if (siteName === null) return null;

  const description = parseString(payload.description, MAX_DESCRIPTION);
  if (description === null) return null;

  const theme = parseTheme(payload.theme);
  if (theme === null) return null;

  const modules = parseModules(payload.modules);
  if (modules === null) return null;

  return { siteName, description, theme, modules };
}

/**
 * Resuelve el dominio a consultar. En desarrollo, las peticiones a localhost usan
 * `devDomain` para poder probar empresas registradas localmente.
 */
export function resolveRequestDomain(
  hostname: string | null | undefined,
  options: { devDomain?: string | null; isDev?: boolean } = {},
): string | null {
  const normalized = normalizeHostname(hostname);
  if (normalized === null) return null;

  const isLocal = normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
  if (options.isDev && isLocal && options.devDomain) {
    return normalizeHostname(options.devDomain) ?? normalized;
  }
  return normalized;
}
