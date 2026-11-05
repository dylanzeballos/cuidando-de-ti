/** Filtros y textos de la pantalla de usuarios, compartidos por la página. */
import { NEW_USER_FIELD_ERRORS } from '@/lib/admin/identity-validation';

export type UserFilter = 'all' | 'active' | 'inactive';

export const USER_FIELD_ERROR_TEXT: Record<string, string> = {
  'email-required': 'Escribe el correo del usuario.',
  'email-invalid': 'El correo no tiene un formato válido.',
  'displayName-required': 'Escribe el nombre visible.',
  'password-length': 'La contraseña debe tener entre 8 y 72 caracteres.',
};

export type UserFilters = {
  statusParam: string | null;
  query: string;
  activeFilter: boolean | undefined;
  currentFilter: UserFilter;
};

export function parseUserFilters(searchParams: URLSearchParams): UserFilters {
  const statusParam = searchParams.get('estado');
  const query = (searchParams.get('q') ?? '').trim();
  const activeFilter =
    statusParam === 'activos' ? true : statusParam === 'inactivos' ? false : undefined;
  const currentFilter: UserFilter =
    activeFilter === true ? 'active' : activeFilter === false ? 'inactive' : 'all';
  return { statusParam, query, activeFilter, currentFilter };
}

export function userFilterHref(filter: UserFilter, query: string): string {
  const params = new URLSearchParams();
  if (filter === 'active') params.set('estado', 'activos');
  if (filter === 'inactive') params.set('estado', 'inactivos');
  if (query) params.set('q', query);
  const search = params.toString();
  return `/admin/usuarios${search ? `?${search}` : ''}`;
}

/** Mensaje de error de campo solo cuando el formulario de alta falló. */
export function userFieldError(form: string | null, error: string | null): string | null {
  if (form !== 'create' || error === null || !NEW_USER_FIELD_ERRORS.has(error)) return null;
  return USER_FIELD_ERROR_TEXT[error] ?? 'Revisa este campo.';
}
