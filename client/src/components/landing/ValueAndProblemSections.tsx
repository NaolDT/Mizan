import {
  BookOpen,
  CircleHelp,
  Languages,
  LineChart,
  MapPin,
  Mic,
  Sparkles,
  Wallet,
} from "lucide-react";
import { CONTAINER, IconTile, SectionHeading, useLandingCopy } from "./shared";

const VALUE_ICONS = [MapPin, Languages, Mic, Wallet, Sparkles];
const PROBLEM_ICONS = [BookOpen, CircleHelp, Languages, LineChart];

export function ValueStrip() {
  const copy = useLandingCopy();
  return (
    <section aria-label="Mizan" className="border-b border-slate-200 bg-white">
      <ul className={`${CONTAINER} grid grid-cols-2 gap-x-4 gap-y-5 py-6 lg:grid-cols-5`}>
        {copy.valueStrip.map((label, index) => {
          const Icon = VALUE_ICONS[index];
          return (
            <li
              key={label}
              className={`flex items-center gap-3 ${index === 4 ? "col-span-2 lg:col-span-1" : ""}`}
            >
              <IconTile>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </IconTile>
              <span className="text-sm font-semibold leading-snug text-slate-800">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ProblemSection() {
  const copy = useLandingCopy();
  return (
    <section aria-labelledby="problem-title" className="bg-slate-50 py-14 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          id="problem-title"
          title={copy.problem.title}
          subtitle={copy.problem.subtitle}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.problem.cards.map((card, index) => {
            const Icon = PROBLEM_ICONS[index];
            return (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
