import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  CreatePurchaseOrderRequest,
  CreateSupplierRequest,
  ProductDto,
  PurchaseOrderDetailDto,
  PurchaseOrderDto,
  ReceivePurchaseRequest,
  RecordSupplierPaymentRequest,
  SupplierDetailDto,
  SupplierDto,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { PURCHASES_TEXT } from "../i18n/purchasesText";
import { SHOP_TEXT } from "../i18n/shopText";
import { TRANSLATIONS } from "../i18n/translations";
import { apiRequest } from "../lib/api";
import { formatEtb, formatShortDate } from "../lib/format";

function newKey(): string {
  return crypto.randomUUID();
}

export function PurchasesPanel() {
  const { language } = useLanguage();
  const text = PURCHASES_TEXT[language];
  const shop = SHOP_TEXT[language];
  const ui = TRANSLATIONS[language];
  const queryClient = useQueryClient();

  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderLines, setOrderLines] = useState([{ productId: "", quantity: "1", unitCost: "" }]);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveMethod, setReceiveMethod] = useState<"CASH" | "TELEBIRR" | "BANK" | "CREDIT">("CASH");

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiRequest<SupplierDto[]>("/suppliers"),
  });
  const supplierDetailQuery = useQuery({
    queryKey: ["supplier", selectedSupplierId],
    queryFn: () => apiRequest<SupplierDetailDto>(`/suppliers/${selectedSupplierId}`),
    enabled: Boolean(selectedSupplierId),
  });
  const ordersQuery = useQuery({
    queryKey: ["purchases"],
    queryFn: () => apiRequest<PurchaseOrderDto[]>("/purchases"),
  });
  const orderDetailQuery = useQuery({
    queryKey: ["purchase", selectedOrderId],
    queryFn: () => apiRequest<PurchaseOrderDetailDto>(`/purchases/${selectedOrderId}`),
    enabled: Boolean(selectedOrderId),
  });
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest<ProductDto[]>("/inventory"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["supplier"] });
    queryClient.invalidateQueries({ queryKey: ["purchases"] });
    queryClient.invalidateQueries({ queryKey: ["purchase"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
    queryClient.invalidateQueries({ queryKey: ["advisor"] });
    queryClient.invalidateQueries({ queryKey: ["notices"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] });
  };

  const createSupplier = useMutation({
    mutationFn: (payload: CreateSupplierRequest) =>
      apiRequest<SupplierDto>("/suppliers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (created) => {
      invalidate();
      setSupplierName("");
      setSupplierPhone("");
      setSelectedSupplierId(created.id);
    },
  });
  const paySupplier = useMutation({
    mutationFn: (payload: RecordSupplierPaymentRequest) =>
      apiRequest<SupplierDetailDto>(`/suppliers/${selectedSupplierId}/payments`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidate();
      setPayAmount("");
    },
  });
  const createOrder = useMutation({
    mutationFn: (payload: CreatePurchaseOrderRequest) =>
      apiRequest<PurchaseOrderDetailDto>("/purchases", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (order) => {
      invalidate();
      setShowOrderForm(false);
      setOrderLines([{ productId: "", quantity: "1", unitCost: "" }]);
      setSelectedOrderId(order.id);
    },
  });
  const receiveOrder = useMutation({
    mutationFn: (payload: ReceivePurchaseRequest) =>
      apiRequest<PurchaseOrderDetailDto>(`/purchases/${selectedOrderId}/receive`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidate();
      setReceiveQty({});
    },
  });
  const cancelOrder = useMutation({
    mutationFn: () =>
      apiRequest<PurchaseOrderDetailDto>(`/purchases/${selectedOrderId}/cancel`, { method: "POST" }),
    onSuccess: () => invalidate(),
  });

  const suppliers = suppliersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const selectedSupplier = useMemo(
    () => suppliers.find((row) => row.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId]
  );
  const orderDetail = orderDetailQuery.data;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{text.suppliersTitle}</h2>
        </div>
        <form
          className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (supplierName.trim().length < 2) return;
            createSupplier.mutate({ name: supplierName.trim(), phone: supplierPhone.trim() || null });
          }}
        >
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder={text.supplierName}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            minLength={2}
          />
          <input
            value={supplierPhone}
            onChange={(e) => setSupplierPhone(e.target.value)}
            placeholder={shop.phone}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
            {createSupplier.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {text.addSupplier}
          </button>
          {createSupplier.error instanceof Error && (
            <p className="text-xs text-rose-600">{createSupplier.error.message}</p>
          )}
        </form>
        {suppliers.length === 0 ? (
          <p className="text-sm text-slate-500">{text.emptySuppliers}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {suppliers.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                    selectedSupplierId === supplier.id ? "bg-emerald-50" : ""
                  }`}
                >
                  <span className="font-semibold text-slate-800">{supplier.name}</span>
                  <span className={supplier.outstandingBalance > 0 ? "text-amber-800" : "text-slate-500"}>
                    {supplier.outstandingBalance > 0
                      ? `${text.owed} ${formatEtb(supplier.outstandingBalance)}`
                      : text.settled}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedSupplier && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-800">{selectedSupplier.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedSupplier.outstandingBalance > 0
                ? `${text.owed} ${formatEtb(selectedSupplier.outstandingBalance)}`
                : text.settled}
            </p>
            {selectedSupplier.outstandingBalance > 0 && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(payAmount);
                  if (!amount) return;
                  paySupplier.mutate({ amount, paymentMethod: "CASH", idempotencyKey: newKey() });
                }}
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={text.paymentAmount}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                  {text.paySupplier}
                </button>
              </form>
            )}
            {paySupplier.error instanceof Error && (
              <p className="mt-2 text-xs text-rose-600">{paySupplier.error.message}</p>
            )}
            {(supplierDetailQuery.data?.ledger.length ?? 0) > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 text-xs">
                {supplierDetailQuery.data!.ledger.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex justify-between py-1.5">
                    <span className="text-slate-600">
                      {row.type} · {formatShortDate(row.createdAt)}
                    </span>
                    <span className="font-semibold">{formatEtb(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{text.ordersTitle}</h2>
          <button
            type="button"
            onClick={() => setShowOrderForm(true)}
            disabled={!selectedSupplierId}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {text.newOrder}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">{text.receiveHint}</p>

        {showOrderForm && selectedSupplierId && (
          <form
            className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const lines = orderLines
                .map((line) => ({
                  productId: line.productId,
                  quantity: Number(line.quantity),
                  unitCost: Number(line.unitCost),
                }))
                .filter((line) => line.productId && line.quantity > 0 && line.unitCost > 0);
              if (!lines.length) return;
              createOrder.mutate({
                supplierId: selectedSupplierId,
                idempotencyKey: newKey(),
                lines,
              });
            }}
          >
            {orderLines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-3">
                <select
                  value={line.productId}
                  onChange={(e) => {
                    const next = [...orderLines];
                    const product = products.find((row) => row.id === e.target.value);
                    next[index] = {
                      ...line,
                      productId: e.target.value,
                      unitCost: product?.costPrice != null ? String(product.costPrice) : line.unitCost,
                    };
                    setOrderLines(next);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">{shop.productName}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...orderLines];
                    next[index] = { ...line, quantity: e.target.value };
                    setOrderLines(next);
                  }}
                  placeholder={text.quantity}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => {
                    const next = [...orderLines];
                    next[index] = { ...line, unitCost: e.target.value };
                    setOrderLines(next);
                  }}
                  placeholder={text.unitCost}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOrderLines([...orderLines, { productId: "", quantity: "1", unitCost: "" }])}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800"
              >
                {text.addLine}
              </button>
              <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                {text.placeOrder}
              </button>
              <button type="button" onClick={() => setShowOrderForm(false)} className="text-xs text-slate-500">
                {shop.cancel}
              </button>
            </div>
            {createOrder.error instanceof Error && (
              <p className="text-xs text-rose-600">{createOrder.error.message}</p>
            )}
          </form>
        )}

        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">{text.emptyOrders}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                    selectedOrderId === order.id ? "bg-emerald-50" : ""
                  }`}
                >
                  <span>
                    <span className="font-semibold text-slate-800">{order.supplierName}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {text.status[order.status]} · {formatShortDate(order.createdAt)}
                    </span>
                  </span>
                  <span className="font-bold text-slate-900">{formatEtb(order.orderedTotal)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {orderDetail && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-800">
              {orderDetail.supplierName} · {text.status[orderDetail.status]}
            </p>
            <ul className="mt-2 divide-y divide-slate-100 text-xs">
              {orderDetail.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-slate-700">
                    {item.productName} · {item.quantityReceived}/{item.quantityOrdered} · {formatEtb(item.unitCost)}
                  </span>
                  {orderDetail.status !== "CANCELLED" && orderDetail.status !== "RECEIVED" && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receiveQty[item.id] ?? ""}
                      onChange={(e) => setReceiveQty((current) => ({ ...current, [item.id]: e.target.value }))}
                      placeholder={text.quantity}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  )}
                </li>
              ))}
            </ul>
            {orderDetail.status !== "CANCELLED" && orderDetail.status !== "RECEIVED" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value as typeof receiveMethod)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  {Object.entries(ui.paymentMethods).map(([method, label]) => (
                    <option key={method} value={method}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const lines = orderDetail.items
                      .map((item) => ({ itemId: item.id, quantity: Number(receiveQty[item.id]) }))
                      .filter((line) => line.quantity > 0);
                    if (!lines.length) return;
                    receiveOrder.mutate({
                      idempotencyKey: newKey(),
                      paymentMethod: receiveMethod,
                      lines,
                    });
                  }}
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                >
                  {text.confirmReceive}
                </button>
                {orderDetail.receivedTotal === 0 && (
                  <button
                    type="button"
                    onClick={() => cancelOrder.mutate()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {text.cancelOrder}
                  </button>
                )}
              </div>
            )}
            {receiveOrder.error instanceof Error && (
              <p className="mt-2 text-xs text-rose-600">{receiveOrder.error.message}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
