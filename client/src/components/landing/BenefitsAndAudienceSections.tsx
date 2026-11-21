import {
  Calculator,
  Clock,
  Lightbulb,
  MapPin,
  Mic,
  Rocket,
  Smile,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { CONTAINER, IconTile, SectionHeading, useLandingCopy } from "./shared";

const BENEFIT_ICONS = [Smile, Mic, Calculator, Clock, Lightbulb, MapPin];
const AUDIENCE_ICONS = [Store, Truck, Users, Rocket, Wrench, TrendingUp];

/** Also the "About Mizan" anchor, so the navigation link has a real destination. */
export function BenefitsSection() {
  const copy = useLandingCopy();
  return (
    <section
      id="about"
      aria-labelledby="benefits-title"
      className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20"
    >
      <div className={CONTAINER}>
        <SectionHeading id="benefits-title" title={copy.benefits.title} subtitle={copy.benefits.about} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.benefits.cards.map((card, index) => {
            const Icon = BENEFIT_ICONS[index];
            return (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <IconTile>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </IconTile>
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

export function AudienceSection() {
  const copy = useLandingCopy();
  return (
    <section id="businesses" aria-labelledby="audience-title" className="bg-white py-14 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          id="audience-title"
          title={copy.audience.title}
          subtitle={copy.audience.subtitle}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.audience.cards.map((card, index) => {
            const Icon = AUDIENCE_ICONS[index];
            return (
              <article
                key={card.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <IconTile>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{card.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
