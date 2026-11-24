import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  CreateCustomerRequest,
  CustomerDetailDto,
  CustomerDto,
  RecordCustomerPaymentRequest,
  UpdateCustomerRequest,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { SHOP_TEXT } from "../i18n/shopText";
import { apiRequest } from "../lib/api";
import { formatEtb, formatShortDate } from "../lib/format";

export function CustomersPanel() {
  const { language } = useLanguage();
  const text = SHOP_TEXT[language];
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const listQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiRequest<CustomerDto[]>("/customers"),
  });

  const detailQuery = useQuery({
    queryKey: ["customer", selectedId],
    queryFn: () => apiRequest<CustomerDetailDto>(`/customers/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setPhone("");
    setNotes("");
  };

  const startEdit = (customer: CustomerDto) => {
    setEditing(customer);
    setShowForm(true);
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setNotes(customer.notes ?? "");
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerRequest) =>
      apiRequest<CustomerDto>("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCustomerRequest }) =>
      apiRequest<CustomerDto>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean }>(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["advisor"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] });
      if (selectedId === id) setSelectedId(null);
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: RecordCustomerPaymentRequest }) =>
      apiRequest<CustomerDetailDto>(`/customers/${id}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["advisor"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] });
      setPayAmount("");
    },
  });

  const customers = (listQuery.data ?? []).filter((customer) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      customer.name.toLowerCase().includes(q) ||
      (customer.phone ?? "").toLowerCase().includes(q)
    );
  });
  const detail = detailQuery.data;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{text.addCustomer}</h2>
          <button
            type="button"
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            {text.addCustomer}
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={text.search}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />

        {showForm && (
          <form
            className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const payload = { name, phone: phone || undefined, notes: notes || undefined };
              if (editing) {
                updateMutation.mutate({ id: editing.id, body: payload });
              } else {
                createMutation.mutate(payload);
              }
            }}
          >
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={text.customerName}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={text.phone}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={text.notes}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {text.save}
            </button>
          </form>
        )}

        {customers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            {text.emptyCustomers}
          </p>
        ) : (
          <ul className="space-y-2">
            {customers.map((customer) => (
              <li key={customer.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(customer.id)}
                  className={`flex min-w-0 flex-1 items-center justify-between rounded-xl border px-3 py-3 text-left ${
                    selectedId === customer.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="truncate font-semibold text-slate-900">{customer.name}</span>
                  <span
                    className={`ml-2 shrink-0 text-xs font-bold ${
                      customer.outstandingBalance > 0 ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    {customer.outstandingBalance > 0
                      ? formatEtb(customer.outstandingBalance)
                      : text.settled}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(customer)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  title={text.edit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(text.deleteItem)) deleteMutation.mutate(customer.id);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title={text.deleteItem}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {deleteMutation.error && (
          <p className="text-xs text-rose-600">
            {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Error"}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
        {!detail ? (
          <p className="text-sm text-slate-500">{text.emptyCustomers}</p>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900">{detail.name}</h3>
            {detail.phone && <p className="text-xs text-slate-500">{detail.phone}</p>}
            {detail.notes && <p className="mt-1 text-xs text-slate-500">{detail.notes}</p>}
            <p className="mt-3 text-2xl font-bold text-amber-800">
              {formatEtb(detail.outstandingBalance)}
            </p>
            <p className="text-xs text-slate-500">{text.owes}</p>

            {detail.outstandingBalance > 0 && (
              <form
                className="mt-4 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(payAmount);
                  if (!amount) return;
                  payMutation.mutate({
                    id: detail.id,
                    body: {
                      amount,
                      idempotencyKey: `pay-${detail.id}-${Date.now()}`,
                    },
                  });
                }}
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={text.paymentAmount}
                  className="w-36 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                >
                  {text.recordPayment}
                </button>
              </form>
            )}
            {payMutation.error && (
              <p className="mt-2 text-xs text-rose-600">
                {payMutation.error instanceof Error ? payMutation.error.message : "Error"}
              </p>
            )}

            <h4 className="mt-6 text-sm font-bold text-slate-800">{text.history}</h4>
            <ul className="mt-2 divide-y divide-slate-100">
              {detail.ledger.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-slate-600">
                    {entry.type.replace("_", " ").toLowerCase()} · {formatShortDate(entry.createdAt)}
                  </span>
                  <span className={entry.amount >= 0 ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                    {entry.amount >= 0 ? "+" : ""}
                    {formatEtb(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
