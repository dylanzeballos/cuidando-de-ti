import { contrastRatio, isSafeColor, type SiteTheme } from '@/lib/site-contract';

/**
 * Tema por defecto, seguro y sin marca de ninguna empresa concreta. Se usa
 * cuando la configuración no aporta un tema o cuando este no es seguro de
 * renderizar (colores inválidos o contraste insuficiente).
 */
export const DEFAULT_THEME: SiteTheme = {
  primary: '#1a7fb8',
  background: '#ffffff',
  foreground: '#0f1c2e',
};

/** Contraste mínimo de texto normal (WCAG AA). */
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Resuelve el tema que se aplicará en el layout. Los colores deben ser
 * hexadecimales y mantener contraste suficiente entre tinte y fondo; en
 * cualquier otro caso se degrada al tema por defecto sin inyectar CSS inseguro.
 */
export function resolveTheme(theme: unknown): SiteTheme {
  if (typeof theme !== 'object' || theme === null) return DEFAULT_THEME;

  const candidate = theme as Partial<SiteTheme>;
  if (
    !isSafeColor(candidate.primary) ||
    !isSafeColor(candidate.background) ||
    !isSafeColor(candidate.foreground)
  ) {
    return DEFAULT_THEME;
  }

  const textContrast = contrastRatio(candidate.foreground, candidate.background);
  const accentContrast = contrastRatio(candidate.primary, candidate.background);
  if (
    textContrast === null ||
    accentContrast === null ||
    textContrast < MIN_TEXT_CONTRAST ||
    accentContrast < MIN_TEXT_CONTRAST
  ) {
    return DEFAULT_THEME;
  }

  return {
    primary: candidate.primary,
    background: candidate.background,
    foreground: candidate.foreground,
  };
}

/**
 * Variables CSS del tema de la empresa. Los colores ya están validados como
 * hexadecimales, por lo que es seguro inyectarlos como estilo en línea.
 */
export function themeStyle(theme: SiteTheme): string {
  return [
    `--empresa-primary:${theme.primary}`,
    `--empresa-background:${theme.background}`,
    `--empresa-foreground:${theme.foreground}`,
  ].join(';');
}
