import { Mic, TrendingUp, UserPlus } from "lucide-react";
import { CONTAINER, SectionHeading, useLandingCopy } from "./shared";

const STEP_ICONS = [UserPlus, Mic, TrendingUp];

export function HowItWorksSection() {
  const copy = useLandingCopy();
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="border-y border-slate-200 bg-slate-50 py-14 sm:py-20"
    >
      <div className={CONTAINER}>
        <SectionHeading id="how-title" title={copy.how.title} subtitle={copy.how.subtitle} />

        <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
          {/* Connecting line, only where the steps sit side by side. */}
          <div
            aria-hidden="true"
            className="absolute left-[16.6%] right-[16.6%] top-7 hidden border-t-2 border-dashed border-emerald-300 md:block"
          />
          {copy.how.steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <li
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-5 text-left md:text-center"
              >
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white md:mx-auto">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {copy.how.step} {index + 1}
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
