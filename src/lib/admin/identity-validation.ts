/**
 * Validación de servidor de los formularios de administración de identidad.
 * Es pura y no llama a la API: los datos inválidos se rechazan antes de cualquier
 * petición. Se prueba con Vitest.
 */

export type NewUserFieldError =
  | 'email-required'
  | 'email-invalid'
  | 'displayName-required'
  | 'password-length';

export const NEW_USER_FIELD_ERRORS: ReadonlySet<string> = new Set<NewUserFieldError>([
  'email-required',
  'email-invalid',
  'displayName-required',
  'password-length',
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

/** Devuelve el primer error de campo del alta de usuario, o `null` si es válido. */
export function validateNewUser(input: {
  email: string;
  displayName: string;
  password: string;
}): NewUserFieldError | null {
  const email = input.email.trim();
  if (email.length === 0) return 'email-required';
  if (!EMAIL.test(email)) return 'email-invalid';
  if (input.displayName.trim().length === 0) return 'displayName-required';
  if (input.password.length < MIN_PASSWORD || input.password.length > MAX_PASSWORD) return 'password-length';
  return null;
}

/** El nombre de un rol es el único campo obligatorio del formulario de rol. */
export function validateRoleName(name: string): 'name-required' | null {
  return name.trim().length === 0 ? 'name-required' : null;
}
