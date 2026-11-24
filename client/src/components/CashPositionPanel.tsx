import { useQuery } from "@tanstack/react-query";
import type { CashFlowDto } from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/api";
import { TRANSLATIONS } from "../i18n/translations";
import { formatEtb } from "../lib/format";

export function CashPositionPanel({ range }: { range: "today" | "week" | "month" }) {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const query = useQuery({
    queryKey: ["cash-flow", range],
    queryFn: () => apiRequest<CashFlowDto>(`/analytics/cash-flow?range=${range}`),
  });

  if (query.isError) {
    return (
      <section className="rounded-2xl border border-rose-100 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">{t.cashPositionTitle}</h3>
        <p className="mt-2 text-xs text-rose-600">
          {query.error instanceof Error ? query.error.message : "Could not load cash position."}
        </p>
      </section>
    );
  }

  if (!query.data) {
    return (
      <section
        className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
        aria-busy="true"
        aria-label={t.cashPositionTitle}
      />
    );
  }

  const cash = query.data;

  const cells = [
    { label: t.cashCollected, value: cash.collectedIn, tone: "text-emerald-800" },
    { label: t.creditSalesLabel, value: cash.creditSales, tone: "text-amber-800" },
    { label: t.collectionsLabel, value: cash.collections, tone: "text-slate-900" },
    { label: t.cashSpent, value: cash.spent, tone: "text-rose-700" },
    { label: t.netCashMovement, value: cash.netCashMovement, tone: cash.netCashMovement >= 0 ? "text-emerald-800" : "text-rose-700" },
    { label: t.outstandingNow, value: cash.outstanding, tone: "text-slate-900" },
  ] as const;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{t.cashPositionTitle}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">{t.cashPositionHint}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">{cell.label}</p>
            <p className={`mt-0.5 text-sm font-bold ${cell.tone}`}>{formatEtb(cell.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
