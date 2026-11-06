/** Tipos públicos del catálogo y el inventario del panel. */

export type Category = {
  id: string;
  name: string;
  active: boolean;
};

export type Product = {
  id: string;
  sku: string;
  brand: string | null;
  name: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  costPrice: number | null;
  categoryId: string | null;
  active: boolean;
};

export type ProductPage = {
  items: Product[];
  page: number;
  size: number;
  total: number;
};

export type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
};

export type Stock = {
  branchId: string;
  productId: string;
  quantity: number;
};

export type AdminResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'validation'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'notFound'; message: string }
  | { status: 'unavailable'; message: string };

export type CreateProductInput = {
  name: string;
  unit: string;
  unitPrice: number;
  brand?: string | null;
  description?: string | null;
  costPrice?: number;
  categoryId?: string | null;
};

export type UpdateProductInput = {
  name?: string;
  brand?: string | null;
  description?: string | null;
  unit?: string;
  unitPrice?: number;
  costPrice?: number;
  categoryId?: string | null;
  active?: boolean;
};

export type CreateBranchInput = {
  code: string;
  name: string;
  address?: string | null;
};

export type RegisterMovementInput = {
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  branchId: string;
  productId: string;
  quantity: number;
  reason?: string | null;
};

export type TransferInput = {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  quantity: number;
};

export type Transfer = {
  transferId: string;
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  quantity: number;
};
