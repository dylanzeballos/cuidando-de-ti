import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  normalizeHostname,
  parseSiteConfig,
  resolveRequestDomain,
} from '@/lib/site-contract';

describe('normalizeHostname', () => {
  it('normaliza mayúsculas, puerto y punto final', () => {
    expect(normalizeHostname('Acme.Test:8080.')).toBe('acme.test');
    expect(normalizeHostname('  ACME.TEST  ')).toBe('acme.test');
  });

  it('extrae el hostname de una URL completa', () => {
    expect(normalizeHostname('https://acme.test/login?x=1')).toBe('acme.test');
  });

  it('rechaza valores vacíos o inválidos', () => {
    expect(normalizeHostname('')).toBeNull();
    expect(normalizeHostname('   ')).toBeNull();
    expect(normalizeHostname(null)).toBeNull();
    expect(normalizeHostname(undefined)).toBeNull();
    expect(normalizeHostname('no es un host')).toBeNull();
    expect(normalizeHostname('-acme.test')).toBeNull();
  });
});

describe('parseSiteConfig', () => {
  it('acepta una respuesta válida', () => {
    const parsed = parseSiteConfig({
      siteName: 'Acme Industrial',
      description: 'Soluciones industriales',
      theme: { primary: '#1f5135', background: '#f8f8f6', foreground: '#18221d' },
      modules: ['commerce', 'billing', 'commerce'],
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.modules).toEqual(['commerce', 'billing']);
  });

  it('rechaza colores que no son hexadecimales (evita inyección de CSS)', () => {
    const parsed = parseSiteConfig({
      siteName: 'Acme',
      description: 'Desc',
      theme: {
        primary: 'red; background: url(https://evil.test/x)',
        background: '#f8f8f6',
        foreground: '#18221d',
      },
      modules: [],
    });
    expect(parsed).toBeNull();
  });

  it('rechaza combinaciones de color con contraste insuficiente', () => {
    const parsed = parseSiteConfig({
      siteName: 'Acme',
      description: 'Desc',
      theme: { primary: '#eeeeee', background: '#ffffff', foreground: '#dddddd' },
      modules: [],
    });
    expect(parsed).toBeNull();
  });

  it('rechaza formas incompletas o tipos incorrectos', () => {
    expect(parseSiteConfig(null)).toBeNull();
    expect(parseSiteConfig([])).toBeNull();
    expect(parseSiteConfig({ siteName: 'Acme' })).toBeNull();
    expect(
      parseSiteConfig({
        siteName: 'Acme',
        description: 'Desc',
        theme: { primary: '#000', background: '#fff' },
        modules: [],
      }),
    ).toBeNull();
    expect(
      parseSiteConfig({
        siteName: 'Acme',
        description: 'Desc',
        theme: { primary: '#000', background: '#fff', foreground: '#111' },
        modules: 'commerce',
      }),
    ).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('calcula el contraste entre negro y blanco', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
  });

  it('devuelve null con colores inválidos', () => {
    expect(contrastRatio('red', '#ffffff')).toBeNull();
  });
});

describe('resolveRequestDomain', () => {
  it('usa el hostname de la petición en producción', () => {
    expect(resolveRequestDomain('Acme.Test', { isDev: false })).toBe('acme.test');
  });

  it('aplica el dominio de desarrollo solo para localhost en desarrollo', () => {
    expect(resolveRequestDomain('localhost', { devDomain: 'acme.test', isDev: true })).toBe(
      'acme.test',
    );
    expect(resolveRequestDomain('localhost', { devDomain: 'acme.test', isDev: false })).toBe(
      'localhost',
    );
    expect(resolveRequestDomain('acme.test', { devDomain: 'other.test', isDev: true })).toBe(
      'acme.test',
    );
  });

  it('devuelve null si el hostname no es válido', () => {
    expect(resolveRequestDomain('bad host', { isDev: true })).toBeNull();
  });
});
