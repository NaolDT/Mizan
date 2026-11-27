import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import type {
  CheckoutSaleRequest,
  CheckoutSaleResponse,
  CustomerDto,
  PaymentMethod,
  ProductDto,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { POS_TEXT } from "../i18n/posText";
import { TRANSLATIONS } from "../i18n/translations";
import { apiRequest } from "../lib/api";
import { formatEtb } from "../lib/format";

type CartLine = { product: ProductDto; quantity: number };

export function PosPanel() {
  const { language } = useLanguage();
  const text = POS_TEXT[language];
  const ui = TRANSLATIONS[language];
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("");
  const [receipt, setReceipt] = useState<CheckoutSaleResponse | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest<ProductDto[]>("/inventory"),
  });
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiRequest<CustomerDto[]>("/customers"),
  });

  const checkout = useMutation({
    mutationFn: (payload: CheckoutSaleRequest) =>
      apiRequest<CheckoutSaleResponse>("/sales/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["advisor"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] });
      setCart([]);
      setDiscount("");
      setReceipt(data);
    },
  });

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const q = query.trim().toLowerCase();
  const matches = products.filter((product) => {
    if (!q) return true;
    return (
      product.name.toLowerCase().includes(q) ||
      (product.barcode ?? "").toLowerCase() === q ||
      (product.brand ?? "").toLowerCase().includes(q)
    );
  });

  const addProduct = (product: ProductDto) => {
    if (product.sellingPrice == null) return;
    setReceipt(null);
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const barcodeHit = useMemo(
    () => products.find((product) => (product.barcode ?? "").toLowerCase() === q),
    [products, q]
  );

  const subtotal = cart.reduce(
    (sum, line) => sum + (line.product.sellingPrice ?? 0) * line.quantity,
    0
  );
  const discountAmount = Number(discount) || 0;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <section className="space-y-3 lg:col-span-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (barcodeHit) {
              addProduct(barcodeHit);
              setQuery("");
            }
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={text.search}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </form>
        {products.length === 0 ? (
          <p className="text-sm text-slate-500">{text.emptyProducts}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {matches.slice(0, 24).map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={product.sellingPrice == null}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left disabled:opacity-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{product.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {text.stock} {product.quantityOnHand}
                      {product.sellingPrice == null ? ` · ${text.noPrice}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    {product.sellingPrice != null ? formatEtb(product.sellingPrice) : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <h2 className="text-sm font-bold text-slate-800">{text.cart}</h2>
        {receipt ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-semibold text-emerald-800">{text.receipt}</p>
            <p>
              {text.total}: {formatEtb(receipt.total)}
            </p>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
            >
              {text.newSale}
            </button>
          </div>
        ) : cart.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{text.emptyCart}</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-slate-100">
              {cart.map((line) => (
                <li key={line.product.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-semibold text-slate-800">{line.product.name}</span>
                    <span className="block text-[11px] text-slate-500">
                      {formatEtb(line.product.sellingPrice ?? 0)} × {line.quantity}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.map((row) =>
                            row.product.id === line.product.id
                              ? { ...row, quantity: Math.max(0.01, row.quantity - 1) }
                              : row
                          )
                        )
                      }
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.map((row) =>
                            row.product.id === line.product.id ? { ...row, quantity: row.quantity + 1 } : row
                          )
                        )
                      }
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCart((current) => current.filter((row) => row.product.id !== line.product.id))}
                      className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{text.walkIn}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {!customerId && (
              <input
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder={text.customer}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(ui.paymentMethods).map(([method, label]) => (
                <option key={method} value={method}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder={text.discount}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-3 text-xs text-slate-500">
              {text.subtotal}: {formatEtb(subtotal)}
            </p>
            <p className="text-sm font-bold text-slate-900">
              {text.total}: {formatEtb(Math.max(0, subtotal - discountAmount))}
            </p>
            <button
              type="button"
              onClick={() =>
                checkout.mutate({
                  idempotencyKey: crypto.randomUUID(),
                  paymentMethod,
                  customerId: customerId || null,
                  counterpartyName: customerId ? null : walkInName.trim() || null,
                  discountAmount: discountAmount || undefined,
                  lines: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
                })
              }
              disabled={checkout.isPending}
              className="mt-3 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white"
            >
              {text.charge}
            </button>
            {checkout.error instanceof Error && (
              <p className="mt-2 text-xs text-rose-600">{checkout.error.message}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
