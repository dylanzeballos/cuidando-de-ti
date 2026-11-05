import type { FetchLike } from '@/lib/site-client';
import type {
  AdminResult,
  Branch,
  Category,
  CreateBranchInput,
  CreateProductInput,
  Product,
  ProductPage,
  RegisterMovementInput,
  Stock,
  Transfer,
  TransferInput,
  UpdateProductInput,
} from './catalog-types';

export type * from './catalog-types';


export type AdminClientOptions = {
  /** URL base del backend, por ejemplo `http://localhost:8080/api/v1`. */
  baseUrl: string;
  /** Token de acceso de la sesión. Solo se usa en el servidor; nunca se envía al navegador. */
  token: string;
  /** Inyectable para pruebas. */
  fetchImpl?: FetchLike;
};

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Cliente de servidor para el panel de administración. Nunca lanza: traduce las
 * respuestas del backend a un resultado discriminado para la página.
 */
export function createAdminClient(options: AdminClientOptions) {
  const { baseUrl, token, fetchImpl = fetch } = options;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init: RequestInit = {}): Promise<AdminResult<T>> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        ...init,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      });
    } catch {
      return { status: 'unavailable', message: 'No se pudo contactar con la API.' };
    }

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthorized', message: await readMessage(response, 'No autorizado.') };
    }
    if (response.status === 400) {
      return { status: 'validation', message: await readMessage(response, 'Datos inválidos.') };
    }
    if (response.status === 404) {
      return { status: 'notFound', message: await readMessage(response, 'No encontrado.') };
    }
    if (response.status === 409) {
      return { status: 'conflict', message: await readMessage(response, 'Conflicto.') };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: await readMessage(response, 'Error temporal de la API.') };
    }

    return { status: 'ok', data: (await response.json()) as T };
  }

  function postJson<T>(path: string, body: unknown): Promise<AdminResult<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function patchJson<T>(path: string, body: unknown): Promise<AdminResult<T>> {
    return request<T>(path, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return {
    listCategories: () => request<Category[]>('/catalog/categories'),
    createCategory: (name: string) => postJson<Category>('/catalog/categories', { name }),
    listProducts: (params: { query?: string; categoryId?: string; active?: boolean } = {}) => {
      const search = new URLSearchParams();
      if (params.query) search.set('q', params.query);
      if (params.categoryId) search.set('categoryId', params.categoryId);
      if (params.active !== undefined) search.set('active', String(params.active));
      search.set('size', '100');
      return request<ProductPage>(`/catalog/products?${search.toString()}`);
    },
    createProduct: (input: CreateProductInput) => postJson<Product>('/catalog/products', input),
    updateProduct: (productId: string, input: UpdateProductInput) =>
      patchJson<Product>(`/catalog/products/${encodeURIComponent(productId)}`, input),
    updateCategory: (categoryId: string, active: boolean) =>
      patchJson<Category>(`/catalog/categories/${encodeURIComponent(categoryId)}`, { active }),
    listBranches: () => request<Branch[]>('/inventory/branches'),
    createBranch: (input: CreateBranchInput) => postJson<Branch>('/inventory/branches', input),
    getStock: (branchId: string, productId: string) =>
      request<Stock>(`/inventory/stock?branchId=${encodeURIComponent(branchId)}&productId=${encodeURIComponent(productId)}`),
    registerMovement: (input: RegisterMovementInput) =>
      postJson<Stock>('/inventory/movements', input),
    transferStock: (input: TransferInput) =>
      postJson<Transfer>('/inventory/transfers', input),
  };
}

export type AdminClient = ReturnType<typeof createAdminClient>;
