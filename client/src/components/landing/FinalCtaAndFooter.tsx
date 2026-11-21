import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MizanWordmark } from "../brand/MizanLogo";
import {
  CONTAINER,
  PrimaryButton,
  SecondaryButton,
  scrollToId,
  useLandingActions,
  useLandingCopy,
} from "./shared";

export function FinalCtaSection() {
  const copy = useLandingCopy();
  const { goRegister } = useLandingActions();

  return (
    <section aria-labelledby="final-cta-title" className="bg-slate-50 py-14 sm:py-20">
      <div className={CONTAINER}>
        <div className="rounded-3xl bg-emerald-950 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2
            id="final-cta-title"
            className="mx-auto max-w-2xl break-words text-2xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            {copy.finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-emerald-100 sm:text-base">
            {copy.finalCta.body}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <PrimaryButton tone="white" onClick={goRegister}>
              <span>{copy.finalCta.primary}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
            <SecondaryButton tone="dark" onClick={() => scrollToId("features")}>
              {copy.finalCta.secondary}
            </SecondaryButton>
          </div>
        </div>
      </div>
    </section>
  );
}

const linkClass =
  "rounded text-sm text-slate-600 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

function AnchorLink({ id, children }: { id: string; children: string }) {
  return (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        if (id === "home") window.scrollTo({ top: 0, behavior: "smooth" });
        else scrollToId(id);
      }}
      className={linkClass}
    >
      {children}
    </a>
  );
}

export function LandingFooter() {
  const copy = useLandingCopy();
  const f = copy.footer;
  const { user } = useLandingActions();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className={`${CONTAINER} py-12`}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-5">
            <MizanWordmark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">{f.description}</p>
          </div>

          <nav aria-label={f.navTitle} className="lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-900">{f.navTitle}</h2>
            <ul className="mt-3 space-y-2.5">
              <li><AnchorLink id="home">{f.nav.home}</AnchorLink></li>
              <li><AnchorLink id="features">{f.nav.features}</AnchorLink></li>
              <li><AnchorLink id="how-it-works">{f.nav.how}</AnchorLink></li>
              <li><AnchorLink id="about">{f.nav.about}</AnchorLink></li>
            </ul>
          </nav>

          <nav aria-label={f.productTitle} className="lg:col-span-3">
            <h2 className="text-sm font-bold text-slate-900">{f.productTitle}</h2>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link to={user ? "/app" : "/auth?mode=register"} className={linkClass}>
                  {f.product.dashboard}
                </Link>
              </li>
              <li><AnchorLink id="features">{f.product.assistant}</AnchorLink></li>
              <li><AnchorLink id="dashboard-preview">{f.product.tracking}</AnchorLink></li>
              <li><AnchorLink id="voice">{f.product.voice}</AnchorLink></li>
            </ul>
          </nav>

          <nav aria-label={f.legalTitle} className="lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-900">{f.legalTitle}</h2>
            <ul className="mt-3 space-y-2.5">
              <li><Link to="/privacy" className={linkClass}>{f.privacy}</Link></li>
              <li><Link to="/terms" className={linkClass}>{f.terms}</Link></li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-600">{f.copyright}</p>
      </div>
    </footer>
  );
}
