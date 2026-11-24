import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import type { BusinessNoticeDto } from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/api";
import { TRANSLATIONS } from "../i18n/translations";

export function NoticesPanel({ range }: { range: "today" | "week" | "month" }) {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notices", range, language],
    queryFn: () =>
      apiRequest<BusinessNoticeDto[]>(`/analytics/notices?range=${range}&language=${language}`),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ dismissed: boolean }>(`/analytics/notices/${id}/dismiss`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });

  if (query.isError) {
    return (
      <section className="rounded-2xl border border-rose-100 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Bell className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          {t.noticesTitle}
        </h2>
        <p className="mt-2 text-xs text-rose-600">
          {query.error instanceof Error ? query.error.message : "Could not load notices."}
        </p>
      </section>
    );
  }

  if (!query.data) {
    return (
      <section
        className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
        aria-busy="true"
        aria-label={t.noticesTitle}
      />
    );
  }

  const notices = query.data;
  if (notices.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Bell className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {t.noticesTitle}
      </h2>
      <ul className="mt-3 grid gap-2">
        {notices.map((notice) => (
          <li
            key={notice.id}
            className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 ${
              notice.severity === "warning" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            <div>
              <p className="text-sm font-bold">{notice.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed">{notice.body}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissMutation.mutate(notice.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white/70"
            >
              {t.dismissNotice}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
