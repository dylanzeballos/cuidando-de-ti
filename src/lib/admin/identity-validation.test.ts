import { describe, expect, it } from 'vitest';
import { validateNewUser, validateRoleName } from '@/lib/admin/identity-validation';

describe('validateNewUser', () => {
  const valid = { email: 'ana@acme.test', displayName: 'Ana', password: 'secreta123' };

  it('acepta datos válidos', () => {
    expect(validateNewUser(valid)).toBeNull();
  });

  it('exige el correo', () => {
    expect(validateNewUser({ ...valid, email: '   ' })).toBe('email-required');
  });

  it('rechaza un correo mal formado', () => {
    expect(validateNewUser({ ...valid, email: 'ana@' })).toBe('email-invalid');
  });

  it('exige el nombre visible', () => {
    expect(validateNewUser({ ...valid, displayName: ' ' })).toBe('displayName-required');
  });

  it('exige una contraseña entre 8 y 72 caracteres', () => {
    expect(validateNewUser({ ...valid, password: 'corta' })).toBe('password-length');
    expect(validateNewUser({ ...valid, password: 'x'.repeat(73) })).toBe('password-length');
  });
});

describe('validateRoleName', () => {
  it('acepta un nombre y rechaza el vacío', () => {
    expect(validateRoleName('Vendedor')).toBeNull();
    expect(validateRoleName('  ')).toBe('name-required');
  });
});
