import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, resolveTheme, themeStyle } from '@/lib/theme';

describe('resolveTheme', () => {
  it('devuelve el tema validado cuando los colores son seguros', () => {
    const theme = { primary: '#1f5135', background: '#f8f8f6', foreground: '#18221d' };
    expect(resolveTheme(theme)).toEqual(theme);
  });

  it('degrada al tema por defecto ante contraste insuficiente', () => {
    expect(resolveTheme({ primary: '#eeeeee', background: '#ffffff', foreground: '#dddddd' })).toEqual(
      DEFAULT_THEME,
    );
  });

  it('degrada al tema por defecto con colores no hexadecimales', () => {
    expect(
      resolveTheme({ primary: 'red; background: url(x)', background: '#ffffff', foreground: '#111111' }),
    ).toEqual(DEFAULT_THEME);
  });

  it('degrada al tema por defecto con entradas incompletas o ausentes', () => {
    expect(resolveTheme(null)).toEqual(DEFAULT_THEME);
    expect(resolveTheme({ primary: '#000000' })).toEqual(DEFAULT_THEME);
  });
});

describe('themeStyle', () => {
  it('produce variables CSS del modelo empresa', () => {
    const style = themeStyle({ primary: '#1f5135', background: '#f8f8f6', foreground: '#18221d' });
    expect(style).toContain('--empresa-primary:#1f5135');
    expect(style).toContain('--empresa-background:#f8f8f6');
    expect(style).toContain('--empresa-foreground:#18221d');
  });
});
