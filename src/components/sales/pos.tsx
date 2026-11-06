import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computeCart, formatMoney, paymentMethodLabel, validateCart, type CartLine } from '@/lib/sales/cart';
import type { PaymentMethod } from '@/lib/sales/sales-api';

/** Producto del catálogo que el registro de venta puede agregar a una línea. */
export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
};

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'QR'];

type SaleCreated = { id: string; number: number };

type RegisterResponse =
  | { status: 'ok'; saleId: string; number: number }
  | { status: 'validation' | 'conflict' | 'unauthorized' | 'notFound' | 'unavailable'; message: string };

function newIdempotencyKey(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    UNIT: 'unidad',
    KG: 'kg',
    LITER: 'litro',
    PACK: 'paquete',
  };
  return labels[unit] ?? unit.toLowerCase();
}

interface Props {
  branchId: string;
  branchName: string;
  /** Endpoint interno de Astro que registra la venta con la sesión del servidor. */
  registerEndpoint: string;
  products: PosProduct[];
}

/**
 * Estación de venta de la farmacia. Habla con un endpoint de Astro (BFF): el
 * navegador nunca recibe el token ni elige la empresa. El detalle de venta vive
 * solo en memoria; una recarga descarta el armado en curso.
 */
export default function PosIsland({ branchId, branchName, registerEndpoint, products }: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SaleCreated | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => computeCart(items), [items]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list =
      term.length === 0
        ? products
        : products.filter(
            (product) =>
              product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
          );
    return list.slice(0, 30);
  }, [products, query]);

  function addProduct(product: PosProduct) {
    setCreated(null);
    setError(null);
    setItems((previous) => {
      const index = previous.findIndex((line) => line.productId === product.id);
      if (index >= 0) {
        const next = [...previous];
        const line = next[index];
        if (line) next[index] = { ...line, quantity: line.quantity + 1 };
        return next;
      }
      return [
        ...previous,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.unitPrice,
          discount: 0,
          taxRate: product.taxRate,
        },
      ];
    });
    setQuery('');
    searchRef.current?.focus();
  }

  function setQuantity(productId: string, value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    setItems((previous) =>
      previous.map((line) => (line.productId === productId ? { ...line, quantity: value } : line)),
    );
  }

  function removeLine(productId: string) {
    setItems((previous) => previous.filter((line) => line.productId !== productId));
  }

  function resetSale() {
    setItems([]);
    setCreated(null);
    setError(null);
    setQuery('');
    setIdempotencyKey(null);
    searchRef.current?.focus();
  }

  async function register() {
    const validation = validateCart(items);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const key = idempotencyKey ?? newIdempotencyKey();
    setIdempotencyKey(key);
    setSending(true);
    setError(null);

    try {
      const response = await fetch(registerEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({
          branchId,
          items: items.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
          })),
          payments: [{ method, amount: totals.total }],
        }),
      });
      const payload = (await response.json()) as RegisterResponse;
      if (payload.status === 'ok') {
        setCreated({ id: payload.saleId, number: payload.number });
        setItems([]);
        setIdempotencyKey(null);
        return;
      }
      setError(payload.message);
    } catch {
      setError('No pudimos registrar la venta. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  }

  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="pos-grid">
      <section className="pos-catalog" aria-labelledby="pos-buscar">
        <div className="pos-catalog-head">
          <div>
            <h2 id="pos-buscar" className="pos-title">Catálogo</h2>
            <p className="pos-sub">{products.length} productos disponibles en {branchName}.</p>
          </div>
          <span className="pos-counter">{matches.length} resultados</span>
        </div>

        <Label htmlFor="pos-buscar-input" className="sr-only">
          Buscar producto
        </Label>
        <Input
          ref={searchRef}
          id="pos-buscar-input"
          type="search"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, SKU o código…"
          className="pos-search"
        />

        {matches.length === 0 ? (
          <div className="pos-empty">
            <strong>Sin coincidencias</strong>
            <span>Prueba con otro nombre o revisa el catálogo.</span>
          </div>
        ) : (
          <ul className="pos-results" role="list">
            {matches.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="pos-product"
                  onClick={() => addProduct(product)}
                  aria-label={`Agregar ${product.name} al detalle de venta`}
                >
                  <span className="pos-product-main">
                    <strong>{product.name}</strong>
                    <small>
                      {product.sku} · {unitLabel(product.unit)}
                    </small>
                  </span>
                  <span className="pos-product-price">{formatMoney(product.unitPrice)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="pos-sale" aria-labelledby="pos-detalle">
        <div className="pos-sale-head">
          <div>
            <h2 id="pos-detalle" className="pos-title">Detalle de venta</h2>
            <p className="pos-sub">{branchName}</p>
          </div>
          <span className="pos-counter">{itemCount} artículos</span>
        </div>

        {created !== null ? (
          <div className="pos-success" role="status">
            <span className="pos-success-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            <strong>Venta #{created.number} registrada</strong>
            <span>El comprobante quedó disponible para imprimir.</span>
            <div className="pos-success-actions">
              <a className="adm-btn adm-btn--small" href={`/admin/ventas/${created.id}/ticket`}>
                Ver comprobante
              </a>
              <button className="adm-btn adm-btn--small adm-btn--ghost" type="button" onClick={resetSale}>
                Nueva venta
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="pos-empty pos-empty--sale">
            <strong>Detalle vacío</strong>
            <span>Busca un producto y agrégalo para preparar la venta.</span>
          </div>
        ) : (
          <>
            <ul className="pos-lines" role="list">
              {totals.lines.map(({ line, lineTotal }) => (
                <li className="pos-line" key={line.productId}>
                  <span className="pos-line-main">
                    <strong className="pos-line-name">{line.name}</strong>
                    <small className="pos-line-meta">
                      {formatMoney(line.unitPrice)} · {unitLabel(line.unit)}
                    </small>
                  </span>
                  <span className="pos-line-total">{formatMoney(lineTotal)}</span>
                  <span className="pos-line-actions">
                    <span className="pos-stepper">
                      <button
                        type="button"
                        aria-label={`Quitar una unidad de ${line.name}`}
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={String(line.quantity)}
                        onChange={(event) => setQuantity(line.productId, Number(event.target.value))}
                        aria-label={`Cantidad de ${line.name}`}
                      />
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${line.name}`}
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      >
                        +
                      </button>
                    </span>
                    <button
                      type="button"
                      className="pos-remove"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Quitar ${line.name} del detalle de venta`}
                    >
                      Quitar
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <dl className="pos-totals" aria-live="polite" aria-atomic="true">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(totals.subtotal)}</dd>
              </div>
              <div>
                <dt>Descuentos</dt>
                <dd>{formatMoney(totals.discountTotal)}</dd>
              </div>
              {totals.taxIncluded > 0 && (
                <div className="pos-total-muted">
                  <dt>Impuesto incluido</dt>
                  <dd>{formatMoney(totals.taxIncluded)}</dd>
                </div>
              )}
              <div className="pos-total">
                <dt>Total</dt>
                <dd data-testid="pos-total">{formatMoney(totals.total)}</dd>
              </div>
            </dl>

            <div className="pos-payment">
              <Label htmlFor="pos-metodo">Método de pago</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger id="pos-metodo" aria-label="Método de pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {paymentMethodLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              className="pos-register"
              type="button"
              onClick={() => void register()}
              disabled={sending}
            >
              {sending ? 'Registrando…' : `Registrar venta · ${formatMoney(totals.total)}`}
            </button>
            <p className="pos-payment-note">Pago con {paymentMethodLabel(method)}</p>
          </>
        )}

        {error && (
          <p className="pos-error" role="alert">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
