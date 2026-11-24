import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import type { AdvisorReportDto } from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/api";
import { TRANSLATIONS } from "../i18n/translations";
import { formatEtb } from "../lib/format";

export function AdvisorPanel({ range }: { range: "today" | "week" | "month" }) {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const query = useQuery({
    queryKey: ["advisor", range, language],
    queryFn: () =>
      apiRequest<AdvisorReportDto>(`/analytics/advisor?range=${range}&language=${language}`),
  });

  if (query.isError) {
    return (
      <section className="rounded-2xl border border-rose-100 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          {t.advisorTitle}
        </h2>
        <p className="mt-2 text-xs text-rose-600">
          {query.error instanceof Error ? query.error.message : "Could not load the advisor report."}
        </p>
      </section>
    );
  }

  if (!query.data) {
    return (
      <section
        className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
        aria-busy="true"
        aria-label={t.advisorTitle}
      />
    );
  }

  const report = query.data;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {t.advisorTitle}
      </h2>
      <p className="mt-2 text-sm font-semibold text-slate-800">{report.overview.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{report.overview.body}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">{t.cashCollected}</dt>
          <dd className="mt-0.5 text-sm font-bold text-emerald-800">
            {formatEtb(report.metrics.cashCollected)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">{t.creditSalesLabel}</dt>
          <dd className="mt-0.5 text-sm font-bold text-amber-800">
            {formatEtb(report.metrics.creditSales)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">{t.outstandingNow}</dt>
          <dd className="mt-0.5 text-sm font-bold text-slate-900">
            {formatEtb(report.metrics.outstanding)}
          </dd>
        </div>
      </dl>

      {report.actions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t.advisorActions}
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {report.actions.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl px-3 py-2.5 text-sm ${
                  item.severity === "warning"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-emerald-50 text-emerald-900"
                }`}
              >
                <p className="font-bold">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(report.problems.length > 0 || report.positives.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.problems.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t.advisorProblems}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {report.problems.map((item) => (
                  <li key={item.id} className="text-xs text-amber-900">
                    <span className="font-semibold">{item.title}.</span> {item.body}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.positives.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t.advisorPositives}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {report.positives.map((item) => (
                  <li key={item.id} className="text-xs text-emerald-900">
                    <span className="font-semibold">{item.title}.</span> {item.body}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
