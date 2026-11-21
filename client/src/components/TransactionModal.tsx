import { useState } from "react";
import { X } from "lucide-react";
import type {
  CreateTransactionRequest,
  PaymentMethod,
  TransactionCategory,
  TransactionDto,
  TransactionType,
  UpdateTransactionRequest,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { todayIsoDate } from "../lib/format";

const INCOME_CATS: TransactionCategory[] = [
  "SALES",
  "SERVICE_INCOME",
  "OTHER_INCOME",
];

const EXPENSE_CATS: TransactionCategory[] = [
  "INVENTORY_PURCHASE",
  "TRANSPORT",
  "RENT",
  "UTILITIES",
  "SALARY",
  "FOOD",
  "MARKETING",
  "OTHER_EXPENSE",
];

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "TELEBIRR", "BANK", "CREDIT"];

interface TransactionModalProps {
  initialType?: TransactionType;
  editingTransaction?: TransactionDto | null;
  onClose: () => void;
  onCreate?: (payload: CreateTransactionRequest) => Promise<void>;
  onUpdate?: (id: string, payload: UpdateTransactionRequest) => Promise<void>;
}

export function TransactionModal({
  initialType = "INCOME",
  editingTransaction,
  onClose,
  onCreate,
  onUpdate,
}: TransactionModalProps) {
  const { t } = useLanguage();
  const isEditing = Boolean(editingTransaction);

  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type ?? initialType
  );
  const availableCategories = type === "INCOME" ? INCOME_CATS : EXPENSE_CATS;

  const [category, setCategory] = useState<TransactionCategory>(
    editingTransaction?.category ??
      (type === "INCOME" ? "SALES" : "INVENTORY_PURCHASE")
  );
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : ""
  );
  const [description, setDescription] = useState(
    editingTransaction?.description ?? ""
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingTransaction?.paymentMethod ?? "CASH"
  );
  const [counterpartyName, setCounterpartyName] = useState(
    editingTransaction?.counterpartyName ?? ""
  );
  const [dateStr, setDateStr] = useState(
    editingTransaction
      ? editingTransaction.transactionDate.slice(0, 10)
      : todayIsoDate()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(nextType === "INCOME" ? "SALES" : "INVENTORY_PURCHASE");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive ETB amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingTransaction && onUpdate) {
        await onUpdate(editingTransaction.id, {
          category,
          amount: numericAmount,
          description: description.trim() || t.categories[category],
          paymentMethod,
          counterpartyName: counterpartyName.trim() || null,
          transactionDate: dateStr,
        });
      } else if (onCreate) {
        await onCreate({
          type,
          category,
          amount: numericAmount,
          description: description.trim() || t.categories[category],
          paymentMethod,
          counterpartyName: counterpartyName.trim() || null,
          transactionDate: dateStr,
          source: "MANUAL",
          idempotencyKey: `manual-${crypto.randomUUID()}`,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {isEditing
              ? t.editAction
              : type === "INCOME"
                ? t.recordIncome
                : t.recordExpense}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {!isEditing && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleTypeSwitch("INCOME")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  type === "INCOME"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + {t.recordIncome}
              </button>
              <button
                type="button"
                onClick={() => handleTypeSwitch("EXPENSE")}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  type === "EXPENSE"
                    ? "bg-rose-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                - {t.recordExpense}
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.amountLabel}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t.categories[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t.paymentMethodLabel}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {t.paymentMethods[pm]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.descriptionLabel}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.categories[category]}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t.counterpartyLabel}
              </label>
              <input
                type="text"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Abebe / Supplier"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                {t.dateLabel}
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.cancelAction}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "..." : t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
