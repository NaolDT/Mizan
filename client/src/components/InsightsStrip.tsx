import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import type { BusinessInsightsDto } from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { SHOP_TEXT } from "../i18n/shopText";
import { apiRequest } from "../lib/api";

export function InsightsStrip({ range }: { range: "today" | "week" | "month" }) {
  const { language } = useLanguage();
  const text = SHOP_TEXT[language];
  const query = useQuery({
    queryKey: ["insights", range, language],
    queryFn: () =>
      apiRequest<BusinessInsightsDto>(`/analytics/insights?range=${range}&language=${language}`),
  });

  const items = query.data?.items ?? [];
  if (!query.data) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Lightbulb className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {text.insightsTitle}
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{text.noInsights}</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
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
      )}
    </section>
  );
}
