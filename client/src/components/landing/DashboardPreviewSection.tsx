import { ArrowDownRight, ArrowUpRight, Lightbulb, MessageSquare, Plus } from "lucide-react";
import { MizanLogoMark } from "../brand/MizanLogo";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { CONTAINER, IllustrativeBadge, SectionHeading, useLandingCopy } from "./shared";

// Illustrative rows. Labels come from the language files.
const RECENT = [
  { type: "IN", amount: "1,900.00" },
  { type: "OUT", amount: "820.00" },
  { type: "IN", amount: "1,450.00" },
  { type: "OUT", amount: "300.00" },
] as const;

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="truncate text-xs font-medium text-slate-600">{label}</p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${tone}`}>
        {value}
        {value !== "24" && <span className="ml-1 text-xs font-semibold text-slate-500">ETB</span>}
      </p>
    </div>
  );
}

export function DashboardPreviewSection() {
  const copy = useLandingCopy();
  const d = copy.dashboard;

  return (
    <section
      id="dashboard-preview"
      aria-labelledby="dashboard-title"
      className="bg-white py-14 sm:py-20"
    >
      <div className={CONTAINER}>
        <SectionHeading id="dashboard-title" title={d.title} subtitle={d.subtitle} />

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <MizanLogoMark className="h-6 w-6 shrink-0" />
              <span className="truncate text-sm font-bold text-slate-900">{copy.preview.shop}</span>
            </div>
            <IllustrativeBadge label={copy.common.illustrative} />
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label={d.income} value="12,450.00" tone="text-emerald-700" />
              <Kpi label={d.expenses} value="4,280.00" tone="text-rose-600" />
              <Kpi label={d.profit} value="8,170.00" tone="text-slate-900" />
              <Kpi label={d.transactions} value="24" tone="text-slate-900" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <h3 className="text-sm font-bold text-slate-900">{d.chartTitle}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                      {d.income}
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" aria-hidden="true" />
                      {d.expenses}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <IncomeExpenseChart
                    days={d.days}
                    incomeLabel={d.income}
                    expensesLabel={d.expenses}
                    ariaLabel={d.chartLabel}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Lightbulb className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    {d.insightsTitle}
                  </h3>
                  <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-700">
                    {d.insights.map((insight) => (
                      <li key={insight} className="rounded-lg bg-emerald-50 px-3 py-2">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-900">{d.quickTitle}</h3>
                  <div className="mt-2.5 flex flex-wrap gap-2" aria-hidden="true">
                    {d.quick.map((label, index) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        {index === 2 ? (
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <Plus
                            className={`h-3.5 w-3.5 ${index === 0 ? "text-emerald-600" : "text-rose-500"}`}
                          />
                        )}
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">{d.recentTitle}</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {d.recent.map((label, index) => {
                  const row = RECENT[index];
                  const income = row.type === "IN";
                  return (
                    <li key={label} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            income ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {income ? (
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <span className="truncate text-sm text-slate-800">{label}</span>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-bold ${income ? "text-emerald-700" : "text-rose-600"}`}
                      >
                        {income ? "+" : "−"}
                        {row.amount}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
