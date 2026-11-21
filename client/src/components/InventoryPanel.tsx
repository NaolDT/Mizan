import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  ProductDto,
  StockMovementDto,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { SHOP_TEXT } from "../i18n/shopText";
import { apiRequest } from "../lib/api";
import { formatEtb, formatShortDate } from "../lib/format";

export function InventoryPanel() {
  const { language } = useLanguage();
  const text = SHOP_TEXT[language];
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [qty, setQty] = useState("0");
  const [threshold, setThreshold] = useState("5");
  const [adjusting, setAdjusting] = useState<{ id: string; sign: 1 | -1 } | null>(null);
  const [adjustQty, setAdjustQty] = useState("1");

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest<ProductDto[]>("/inventory"),
  });
  const movementsQuery = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => apiRequest<StockMovementDto[]>("/inventory/movements"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) =>
      apiRequest<ProductDto>("/inventory", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      setShowForm(false);
      setName("");
      setQty("0");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdjustStockRequest }) =>
      apiRequest<ProductDto>(`/inventory/${id}/adjust`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      setAdjusting(null);
    },
  });

  const products = productsQuery.data ?? [];
  const movements = movementsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">{text.addProduct}</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {text.addProduct}
        </button>
      </div>

      {showForm && (
        <form
          className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              name,
              unit,
              quantityOnHand: Number(qty) || 0,
              lowStockThreshold: Number(threshold) || 0,
            });
          }}
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={text.productName}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder={text.unit}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={text.quantity}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={text.threshold}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white sm:col-span-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {text.save}
          </button>
          {createMutation.error && (
            <p className="text-xs text-rose-600 sm:col-span-2">
              {createMutation.error instanceof Error ? createMutation.error.message : "Error"}
            </p>
          )}
        </form>
      )}

      {productsQuery.isLoading ? (
        <p className="text-sm text-slate-500">{text.emptyProducts}</p>
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {text.emptyProducts}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <li key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.unit}</p>
                </div>
                {product.isLowStock && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {text.lowStock}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {product.quantityOnHand}
                <span className="ml-1 text-xs font-medium text-slate-500">{product.unit}</span>
              </p>
              {product.sellingPrice != null && (
                <p className="text-xs text-slate-500">{formatEtb(product.sellingPrice)}</p>
              )}
              {adjusting?.id === product.id ? (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(adjustQty);
                    if (!n) return;
                    adjustMutation.mutate({
                      id: product.id,
                      body: {
                        quantityDelta: n * adjusting.sign,
                        reason: adjusting.sign === 1 ? "RESTOCK" : "SALE",
                      },
                    });
                  }}
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    {text.save}
                  </button>
                  <button type="button" onClick={() => setAdjusting(null)} className="text-xs text-slate-500">
                    {text.cancel}
                  </button>
                </form>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjusting({ id: product.id, sign: 1 })}
                    className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
                  >
                    {text.restock}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjusting({ id: product.id, sign: -1 })}
                    className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800"
                  >
                    {text.reduce}
                  </button>
                </div>
              )}
              {adjustMutation.error && adjusting?.id === product.id && (
                <p className="mt-2 text-xs text-rose-600">
                  {adjustMutation.error instanceof Error ? adjustMutation.error.message : "Error"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {movements.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800">{text.movements}</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {movements.slice(0, 12).map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-700">
                  {row.productName} · {row.reason.toLowerCase()} · {formatShortDate(row.createdAt)}
                </span>
                <span className={row.quantityDelta >= 0 ? "font-bold text-emerald-700" : "font-bold text-rose-600"}>
                  {row.quantityDelta >= 0 ? "+" : ""}
                  {row.quantityDelta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
