/**
 * Validación anticipada de los formularios del catálogo con los mismos
 * esquemas Zod que usa el servidor. El servidor sigue siendo la autoridad.
 */
import { formDataToObject, validateCatalogValues } from '@/lib/admin/catalog-schema';
import type { CatalogFormAction, FieldErrors } from '@/lib/admin/catalog-schema';

const FORM_SELECTOR = 'form[data-catalog-form]';

function clearFieldError(form: HTMLFormElement, name: string): void {
  const error = form.querySelector<HTMLElement>(`[data-field-error="${CSS.escape(name)}"]`);
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  const field = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
  field?.removeAttribute('aria-invalid');
  field?.removeAttribute('aria-describedby');
}

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-field-error]').forEach((error) => {
    const name = error.dataset.fieldError;
    if (name) clearFieldError(form, name);
  });
}

function showErrors(form: HTMLFormElement, errors: FieldErrors): void {
  clearErrors(form);
  for (const [name, message] of Object.entries(errors)) {
    const error = form.querySelector<HTMLElement>(`[data-field-error="${CSS.escape(name)}"]`);
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    const field = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
    field?.setAttribute('aria-invalid', 'true');
    if (error?.id) field?.setAttribute('aria-describedby', error.id);
  }
}

function focusFirstError(form: HTMLFormElement): void {
  const field = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  field?.focus();
}

function validate(form: HTMLFormElement): boolean {
  const action = form.dataset.catalogForm as CatalogFormAction | undefined;
  if (!action) return true;

  const result = validateCatalogValues(action, formDataToObject(new FormData(form)));
  if (result.ok) {
    clearErrors(form);
    return true;
  }
  showErrors(form, result.fieldErrors);
  focusFirstError(form);
  return false;
}

document.addEventListener(
  'submit',
  (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(FORM_SELECTOR)) return;
    if (!validate(form)) event.preventDefault();
  },
  true,
);

document.addEventListener(
  'input',
  (event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
      return;
    }
    const form = field.form;
    if (!form || !form.matches(FORM_SELECTOR)) return;
    const name = field.name;
    if (name) clearFieldError(form, name);
  },
  true,
);
