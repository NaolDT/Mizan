import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  InventoryValuationDto,
  ProductDto,
  ProductPriceHistoryDto,
  ProductProfitabilityDto,
  StockMovementDto,
  UpdateProductRequest,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { SHOP_TEXT } from "../i18n/shopText";
import { apiRequest, apiUpload, fetchAuthenticatedBlob } from "../lib/api";
import { compressImageFile } from "../lib/imageCapture";
import { formatEtb, formatShortDate } from "../lib/format";

function ProductThumb({
  productId,
  hasImage,
  alt,
}: {
  productId: string;
  hasImage: boolean;
  alt: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!hasImage) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void fetchAuthenticatedBlob(`/inventory/${productId}/image`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [productId, hasImage]);
  if (!hasImage || !url) return null;
  return <img src={url} alt={alt} className="h-14 w-14 rounded-xl object-cover" />;
}

export function InventoryPanel({ onScanProduct }: { onScanProduct?: () => void }) {
  const { language } = useLanguage();
  const text = SHOP_TEXT[language];
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [qty, setQty] = useState("0");
  const [threshold, setThreshold] = useState("5");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
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
  const profitQuery = useQuery({
    queryKey: ["product-profit", "month"],
    queryFn: () => apiRequest<ProductProfitabilityDto[]>("/inventory/profitability?range=month"),
  });
  const historyQuery = useQuery({
    queryKey: ["price-history", editing?.id],
    queryFn: () => apiRequest<ProductPriceHistoryDto[]>(`/inventory/${editing!.id}/price-history`),
    enabled: Boolean(editing?.id),
  });
  const valuationQuery = useQuery({
    queryKey: ["inventory-valuation"],
    queryFn: () => apiRequest<InventoryValuationDto>("/inventory/valuation"),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setUnit("pcs");
    setQty("0");
    setThreshold("5");
    setSellingPrice("");
    setCostPrice("");
    setBrand("");
    setBarcode("");
    setSizeLabel("");
  };

  const startEdit = (product: ProductDto) => {
    setEditing(product);
    setShowForm(true);
    setName(product.name);
    setUnit(product.unit);
    setQty(String(product.quantityOnHand));
    setThreshold(String(product.lowStockThreshold));
    setSellingPrice(product.sellingPrice != null ? String(product.sellingPrice) : "");
    setCostPrice(product.costPrice != null ? String(product.costPrice) : "");
    setBrand(product.brand ?? "");
    setBarcode(product.barcode ?? "");
    setSizeLabel(product.sizeLabel ?? "");
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) =>
      apiRequest<ProductDto>("/inventory", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductRequest }) =>
      apiRequest<ProductDto>(`/inventory/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["product-profit"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
      resetForm();
    },
  });

  const photoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const thumb = await compressImageFile(file, 640, 0.5);
      const form = new FormData();
      form.append("image", thumb, "product.jpg");
      return apiUpload<ProductDto>(`/inventory/${id}/image`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ deleted: boolean }>(`/inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["product-profit"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
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
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
      setAdjusting(null);
    },
  });

  const products = (productsQuery.data ?? []).filter((product) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [product.name, product.brand, product.barcode, product.sizeLabel]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });
  const movements = movementsQuery.data ?? [];
  const profits = profitQuery.data ?? [];
  const valuation = valuationQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800">{text.addProduct}</h2>
        <div className="flex flex-wrap gap-2">
          {onScanProduct && (
            <button
              type="button"
              onClick={onScanProduct}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800"
            >
              <Camera className="h-4 w-4" />
              {text.scanProduct}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            {text.addProduct}
          </button>
        </div>
      </div>

      {valuation && valuation.productCount > 0 && (
        <p className="text-xs text-slate-500">
          {text.stockValue}: {formatEtb(valuation.costValue)}
          {valuation.retailValue > 0 ? ` · ${formatEtb(valuation.retailValue)}` : ""}
        </p>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={text.search}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />

      {showForm && (
        <form
          className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = {
              name,
              unit,
              brand: brand.trim() || null,
              barcode: barcode.trim() || null,
              sizeLabel: sizeLabel.trim() || null,
              lowStockThreshold: Number(threshold) || 0,
              sellingPrice: sellingPrice ? Number(sellingPrice) : null,
              costPrice: costPrice ? Number(costPrice) : null,
            };
            if (editing) {
              updateMutation.mutate({ id: editing.id, body: payload });
            } else {
              createMutation.mutate({
                ...payload,
                quantityOnHand: Number(qty) || 0,
              });
            }
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
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={text.brand}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={sizeLabel}
            onChange={(e) => setSizeLabel(e.target.value)}
            placeholder={text.sizeLabel}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={text.barcode}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          {!editing && (
            <input
              type="number"
              min="0"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={text.quantity}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={text.threshold}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder={text.sellingPrice}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={text.costPrice}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          {editing && (
            <label className="text-xs text-slate-500 sm:col-span-2">
              {text.addPhoto}
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) photoMutation.mutate({ id: editing.id, file });
                }}
              />
            </label>
          )}
          {editing && (historyQuery.data?.length ?? 0) > 0 && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2">
              <p className="font-semibold text-slate-800">{text.priceHistory}</p>
              <ul className="mt-1 space-y-1">
                {historyQuery.data!.slice(0, 6).map((row) => (
                  <li key={row.id}>
                    {formatShortDate(row.createdAt)}
                    {row.sellingPrice != null ? ` · ${formatEtb(row.sellingPrice)}` : ""}
                    {row.costPrice != null ? ` / ${formatEtb(row.costPrice)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white sm:col-span-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {text.save}
          </button>
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
                <div className="flex items-start gap-3">
                  <ProductThumb productId={product.id} hasImage={product.hasImage} alt={product.name} />
                  <div>
                  <p className="font-bold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {[product.brand, product.sizeLabel, product.unit].filter(Boolean).join(" · ")}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {product.isLowStock && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {text.lowStock}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title={text.edit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(text.deleteItem)) deleteMutation.mutate(product.id);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title={text.deleteItem}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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

      {profits.some((row) => row.salesCount > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-800">{text.profitTitle}</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {profits
              .filter((row) => row.salesCount > 0)
              .slice(0, 8)
              .map((row) => (
                <li key={row.productId} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-slate-700">
                    {row.name} · {text.sold} {row.quantitySold} {row.unit}
                  </span>
                  <span className="font-bold text-slate-900">
                    {row.grossProfit != null
                      ? formatEtb(row.grossProfit)
                      : `${formatEtb(row.revenue)} · ${text.noCostYet}`}
                  </span>
                </li>
              ))}
          </ul>
        </div>
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
