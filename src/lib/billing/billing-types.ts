export type BillingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'OBSERVED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export type BillingDocumentItem = {
  id: string;
  lineNumber: number;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
};

export type BillingDocumentSummary = {
  id: string;
  number: number;
  saleId: string;
  saleNumber: number;
  branchId: string;
  status: BillingStatus;
  documentType: string;
  customerDocumentType: string;
  customerDocumentNumber: string;
  customerName: string;
  customerEmail: string | null;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  cuf: string | null;
  cufd: string | null;
  siatCode: string | null;
  siatMessage: string | null;
  issuedAt: string;
  submittedAt: string | null;
  processedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  attemptCount: number;
  createdAt: string;
};

export type BillingEvent = {
  id: string;
  type: string;
  statusFrom: string | null;
  statusTo: string | null;
  message: string | null;
  actor: string;
  createdAt: string;
};

export type BillingDocument = BillingDocumentSummary & {
  customerAddress: string | null;
  cancelledBy: string | null;
  lastAttemptAt: string | null;
  createdBy: string;
  updatedAt: string;
  items: BillingDocumentItem[];
  events: BillingEvent[];
};

export type BillingSummary = {
  totalDocuments: number;
  counts: Record<BillingStatus, number>;
  totals: Record<BillingStatus, number>;
  processedTotal: number;
  pendingTotal: number;
  retryableCount: number;
};

export type BillingPage<T> = { items: T[]; page: number; size: number; total: number };

export type BillingResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'notFound'; message: string }
  | { status: 'unavailable'; message: string };

export type ListBillingParams = {
  status?: BillingStatus;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
};
