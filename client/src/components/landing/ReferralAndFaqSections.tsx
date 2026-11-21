import { useState } from "react";
import { ArrowRight, ChevronDown, Gift, Store, UserPlus } from "lucide-react";
import { CONTAINER, PrimaryButton, SectionHeading, useLandingActions, useLandingCopy } from "./shared";

const REFERRAL_ICONS = [UserPlus, Store, Gift];

/** The referral and points system is live in the app, so this section is not "coming soon". */
export function ReferralSection() {
  const copy = useLandingCopy();
  const { goRegister } = useLandingActions();
  const r = copy.referral;

  return (
    <section
      aria-labelledby="referral-title"
      className="border-y border-emerald-100 bg-emerald-50 py-14 sm:py-20"
    >
      <div className={CONTAINER}>
        <SectionHeading id="referral-title" title={r.title} subtitle={r.body} />

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {r.steps.map((step, index) => {
            const Icon = REFERRAL_ICONS[index];
            return (
              <li key={step.title} className="rounded-2xl border border-emerald-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-slate-600">
          {r.note}
        </p>
        <div className="mt-5 flex justify-center">
          <PrimaryButton onClick={goRegister}>
            <span>{r.cta}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const copy = useLandingCopy();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-white py-14 sm:py-20">
      <div className={`${CONTAINER} max-w-3xl`}>
        <SectionHeading id="faq-title" title={copy.faq.title} />
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {copy.faq.items.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${index}`}
                    aria-expanded={open}
                    aria-controls={`faq-a-${index}`}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 sm:text-base"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform ${open ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={`faq-a-${index}`}
                  role="region"
                  aria-labelledby={`faq-q-${index}`}
                  hidden={!open}
                  className="px-5 pb-4 text-sm leading-relaxed text-slate-600"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
