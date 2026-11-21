import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Mic,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { MizanLogoMark } from "../brand/MizanLogo";
import {
  CONTAINER,
  IllustrativeBadge,
  PrimaryButton,
  SecondaryButton,
  scrollToId,
  useLandingActions,
  useLandingCopy,
} from "./shared";

function KpiCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "emerald" | "rose" | "slate";
}) {
  const color =
    tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="truncate text-[11px] font-medium text-slate-600">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-tight ${color}`}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-semibold text-slate-500">{unit}</span>}
      </p>
    </div>
  );
}

/** A believable preview of the product, built from the same cards the app uses. */
function ProductPreview() {
  const copy = useLandingCopy();
  const p = copy.preview;
  const steps = [
    { icon: Mic, label: p.stepVoice },
    { icon: Sparkles, label: p.stepUnderstand },
    { icon: CheckCircle2, label: p.stepRecord },
    { icon: TrendingUp, label: p.stepInsight },
  ];

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MizanLogoMark className="h-6 w-6 shrink-0" />
          <span className="truncate text-sm font-bold text-slate-900">{p.shop}</span>
        </div>
        <IllustrativeBadge label={copy.common.illustrative} />
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{p.greeting}</p>
          <p className="text-[11px] text-slate-600">{p.period}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard label={p.income} value="12,450" unit="ETB" tone="emerald" />
          <KpiCard label={p.expenses} value="4,280" unit="ETB" tone="rose" />
          <KpiCard label={p.profit} value="8,170" unit="ETB" tone="emerald" />
          <KpiCard label={p.transactions} value="24" tone="slate" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {p.assistant}
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="ml-auto flex max-w-[90%] items-start gap-2 rounded-2xl rounded-br-md bg-emerald-600 px-3 py-2 text-white">
              <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <p className="break-words font-medium">{p.userMessage}</p>
            </div>

            <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 p-3 text-slate-800">
              <p className="break-words">{p.reply}</p>
              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-white p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-600">−500.00 ETB</p>
                  <p className="truncate text-[11px] text-slate-600">
                    {p.draftType} · {p.draftCategory}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white">
                  {p.confirm}
                </span>
              </div>
            </div>
          </div>
        </div>

        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                {index + 1}
              </span>
              <step.icon className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="truncate">{step.label}</span>
            </li>
          ))}
        </ol>

        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{p.insight}</span>
        </p>
      </div>
    </div>
  );
}

export function HeroSection() {
  const copy = useLandingCopy();
  const { goRegister, openDemo, demoLoading, demoError } = useLandingActions();
  const [line1, line2, line3] = copy.hero.title;

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="border-b border-slate-200 bg-emerald-50/50"
    >
      <div className={`${CONTAINER} grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20`}>
        <div className="min-w-0 lg:col-span-6">
          <p className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="truncate">{copy.hero.badge}</span>
          </p>

          <h1
            id="hero-title"
            className="mt-4 break-words text-[2rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          >
            <span className="block">{line1}</span>
            <span className="block">{line2}</span>
            <span className="block text-emerald-600">{line3}</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {copy.hero.subtitle}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <PrimaryButton onClick={goRegister}>
              <span>{copy.hero.ctaPrimary}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
            <SecondaryButton onClick={() => scrollToId("how-it-works")}>
              {copy.hero.ctaSecondary}
            </SecondaryButton>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => void openDemo()}
              disabled={demoLoading}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900 disabled:opacity-60"
            >
              {demoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {demoLoading ? copy.common.demoStarting : copy.common.tryDemo}
            </button>
          </p>
          {demoError && (
            <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
              {copy.common.demoError}
            </p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-6">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
