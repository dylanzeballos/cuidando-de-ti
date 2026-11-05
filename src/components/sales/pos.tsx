import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { computeCart, formatMoney, paymentMethodLabel, validateCart, type CartLine } from '@/lib/sales/cart';
import type { PaymentMethod } from '@/lib/sales/sales-api';

/** Producto del catálogo que el POS puede agregar a una línea. */
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

interface Props {
  branchId: string;
  /** Endpoint interno de Astro que registra la venta con la sesión del servidor. */
  registerEndpoint: string;
  products: PosProduct[];
}

/**
 * Isla React del armado de venta. Habla con un endpoint de Astro (BFF): el
 * navegador nunca recibe el token ni elige la empresa. El detalle de venta vive solo en
 * memoria; una recarga descarta el armado en curso.
 */
export default function PosIsland({ branchId, registerEndpoint, products }: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SaleCreated | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

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
    return list.slice(0, 20);
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
  }

  function setQuantity(productId: string, value: string) {
    const quantity = Number(value);
    setItems((previous) =>
      previous.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }

  function removeLine(productId: string) {
    setItems((previous) => previous.filter((line) => line.productId !== productId));
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

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="pos-buscar">
        <Label htmlFor="pos-buscar" className="mb-2">Buscar producto</Label>
        <Input
          id="pos-buscar"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o SKU"
        />
        <ul className="mt-3 flex list-none flex-col gap-1 p-0" role="list">
          {matches.length === 0 ? (
            <li className="text-sm text-muted-foreground">Sin productos que coincidan.</li>
          ) : (
            matches.map((product) => (
              <li key={product.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => addProduct(product)}
                  aria-label={`Agregar ${product.name} al detalle de venta`}
                >
                  <span className="truncate">
                    {product.sku} · {product.name} — {formatMoney(product.unitPrice)}
                  </span>
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="pos-detalle">
        <h2 id="pos-detalle" className="m-0 mb-3 text-lg font-medium">
          Detalle de venta
        </h2>
        {items.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Agrega productos para preparar la venta.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Producto</TableHead>
                <TableHead scope="col">Cantidad</TableHead>
                <TableHead scope="col">Precio</TableHead>
                <TableHead scope="col">Importe</TableHead>
                <TableHead scope="col">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.lines.map(({ line, lineTotal }) => (
                <TableRow key={line.productId}>
                  <TableCell>
                    {line.name}
                    <span className="block text-xs text-muted-foreground">{line.sku}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      min="0.001"
                      step="0.001"
                      value={String(line.quantity)}
                      onChange={(event) => setQuantity(line.productId, event.target.value)}
                      aria-label={`Cantidad de ${line.name}`}
                    />
                  </TableCell>
                  <TableCell>{formatMoney(line.unitPrice)}</TableCell>
                  <TableCell>{formatMoney(lineTotal)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Quitar ${line.name} del detalle de venta`}
                    >
                      Quitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-4 flex flex-col gap-1 text-sm" aria-live="polite" aria-atomic="true">
          <p className="m-0 flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </p>
          <p className="m-0 flex justify-between">
            <span>Descuentos</span>
            <span>{formatMoney(totals.discountTotal)}</span>
          </p>
          <p className="m-0 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span data-testid="pos-total">{formatMoney(totals.total)}</span>
          </p>
          {totals.taxIncluded > 0 && (
            <p className="m-0 text-xs text-muted-foreground">
              Impuesto incluido: {formatMoney(totals.taxIncluded)}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <Label htmlFor="pos-metodo">Método de pago</Label>
          <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
            <SelectTrigger id="pos-metodo" className="w-48" aria-label="Método de pago">
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

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void register()}
            disabled={sending || items.length === 0}
          >
            {sending ? 'Registrando…' : 'Registrar venta'}
          </Button>
          <span className="text-sm text-muted-foreground">Pago con {paymentMethodLabel(method)}</span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {created && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3" role="status">
            <p className="m-0">
              Venta <strong>#{created.number}</strong> registrada.
            </p>
            <p className="m-0 mt-1 flex gap-3 text-sm">
              <a className="text-primary underline-offset-4 hover:underline" href={`/admin/ventas/${created.id}/ticket`}>
                Ver comprobante
              </a>
              <a className="text-primary underline-offset-4 hover:underline" href="/admin/ventas/historial">
                Ir al historial
              </a>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
