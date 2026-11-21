import { useRef, useState, type KeyboardEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Languages,
  Lightbulb,
  Mic,
  Pencil,
  Receipt,
  Wallet,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { CONTAINER, IllustrativeBadge, SectionHeading, useLandingCopy } from "./shared";

const TAB_ICONS = [Mic, Languages, BarChart3, Lightbulb, Receipt];
const MANAGEMENT_ICONS = [Receipt, Wallet, CalendarDays, Pencil];

/** One sentence in each supported language, always shown together. */
const LANGUAGE_SAMPLES = [
  { name: "አማርኛ", code: "am", text: "ዛሬ ንግዱ እንዴት ነው?" },
  { name: "Afaan Oromoo", code: "om", text: "Har'a daldalli akkam jira?" },
  { name: "English", code: "en", text: "How is business today?" },
];

function VoiceVisual() {
  const copy = useLandingCopy();
  return (
    <div className="space-y-3">
      <div className="ml-auto flex max-w-[92%] items-start gap-2 rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm text-white">
        <Mic className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="break-words font-medium">{copy.solution.voiceExample}</p>
      </div>
      <div className="rounded-xl border border-emerald-300 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-emerald-700">+2,500.00 ETB</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {copy.solution.income}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{copy.solution.sales}</p>
      </div>
    </div>
  );
}

function LanguageVisual() {
  const { language } = useLanguage();
  return (
    <ul className="space-y-2.5">
      {LANGUAGE_SAMPLES.map((sample) => (
        <li
          key={sample.code}
          className={`rounded-xl border bg-white p-3.5 ${
            language === sample.code ? "border-emerald-500" : "border-slate-200"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            {sample.name}
          </p>
          <p className="mt-1 break-words text-base font-medium text-slate-900">{sample.text}</p>
        </li>
      ))}
    </ul>
  );
}

function TrackingVisual() {
  const copy = useLandingCopy();
  const d = copy.dashboard;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: d.income, value: "12,450", color: "text-emerald-700" },
          { label: d.expenses, value: "4,280", color: "text-rose-600" },
          { label: d.profit, value: "8,170", color: "text-slate-900" },
        ].map((kpi) => (
          <div key={kpi.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="truncate text-[11px] text-slate-600">{kpi.label}</p>
            <p className={`mt-0.5 text-sm font-bold sm:text-base ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <IncomeExpenseChart
          days={d.days}
          incomeLabel={d.income}
          expensesLabel={d.expenses}
          ariaLabel={d.chartLabel}
          heightClass="h-40"
        />
      </div>
    </div>
  );
}

function InsightVisual() {
  const copy = useLandingCopy();
  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm font-medium text-white">
        <p className="break-words">{copy.solution.insightQuestion}</p>
      </div>
      <div className="max-w-[96%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800">
        <p className="break-words">{copy.solution.insightAnswer}</p>
      </div>
    </div>
  );
}

function ManagementVisual() {
  const copy = useLandingCopy();
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {copy.solution.managementItems.map((item, index) => {
        const Icon = MANAGEMENT_ICONS[index];
        return (
          <li key={item.title} className="rounded-xl border border-slate-200 bg-white p-3.5">
            <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

const VISUALS = [VoiceVisual, LanguageVisual, TrackingVisual, InsightVisual, ManagementVisual];
// Visuals that show example numbers or conversations carry the illustrative badge.
const ILLUSTRATIVE = new Set([0, 2, 3]);

export function SolutionSection() {
  const copy = useLandingCopy();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = copy.solution.tabs;
  const Visual = VISUALS[active];

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="features" aria-labelledby="solution-title" className="bg-white py-14 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          id="solution-title"
          title={copy.solution.title}
          subtitle={copy.solution.subtitle}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div
            role="tablist"
            aria-label={copy.solution.tabsLabel}
            aria-orientation="vertical"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:col-span-4 lg:flex-col lg:overflow-visible"
          >
            {tabs.map((tab, index) => {
              const Icon = TAB_ICONS[index];
              const selected = index === active;
              return (
                <button
                  key={tab.label}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`feature-tab-${index}`}
                  aria-selected={selected}
                  aria-controls="feature-panel"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                  onClick={() => setActive(index)}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:w-full ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap lg:whitespace-normal">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="feature-panel"
            aria-labelledby={`feature-tab-${active}`}
            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 lg:col-span-8"
          >
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{tabs[active].title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {tabs[active].body}
            </p>
            <div className="mt-5">
              {ILLUSTRATIVE.has(active) && (
                <div className="mb-3">
                  <IllustrativeBadge label={copy.common.illustrative} />
                </div>
              )}
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
