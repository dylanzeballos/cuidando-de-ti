import type { BillingStatus } from '@/lib/billing/billing-types';

export const BILLING_STATUSES: readonly BillingStatus[] = [
  'PENDING',
  'PROCESSING',
  'PROCESSED',
  'OBSERVED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
];

const LABELS: Record<BillingStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Enviando',
  PROCESSED: 'Procesada',
  OBSERVED: 'Observada',
  REJECTED: 'Rechazada',
  FAILED: 'Con error',
  CANCELLED: 'Anulada',
};

const DESCRIPTIONS: Record<BillingStatus, string> = {
  PENDING: 'Creada y pendiente de envío al SIAT.',
  PROCESSING: 'El envío al SIAT está en curso.',
  PROCESSED: 'Validada por el SIAT.',
  OBSERVED: 'El SIAT la recibió con observaciones.',
  REJECTED: 'El SIAT rechazó el documento.',
  FAILED: 'Falló la comunicación; se puede reintentar.',
  CANCELLED: 'Documento anulado en el ERP.',
};

const TONES: Record<BillingStatus, string> = {
  PENDING: 'adm-badge--warn',
  PROCESSING: 'adm-badge--info',
  PROCESSED: 'adm-badge--on',
  OBSERVED: 'adm-badge--warn',
  REJECTED: 'adm-badge--alert',
  FAILED: 'adm-badge--alert',
  CANCELLED: 'adm-badge--off',
};

export function billingStatusLabel(status: BillingStatus | string): string {
  return LABELS[status as BillingStatus] ?? status;
}

export function billingStatusDescription(status: BillingStatus | string): string {
  return DESCRIPTIONS[status as BillingStatus] ?? '';
}

export function billingStatusTone(status: BillingStatus | string): string {
  return TONES[status as BillingStatus] ?? 'adm-badge--off';
}

export function isBillingStatus(value: string | null | undefined): value is BillingStatus {
  return value !== null && value !== undefined && BILLING_STATUSES.includes(value as BillingStatus);
}

export function isRetryable(status: BillingStatus | string): boolean {
  return status === 'PENDING' || status === 'OBSERVED' || status === 'FAILED';
}

export function isCancellable(status: BillingStatus | string): boolean {
  return status !== 'CANCELLED' && status !== 'PROCESSING';
}
