import { Link } from "react-router-dom";
import { MizanWordmark } from "../components/brand/MizanLogo";
import { useLandingCopy } from "../components/landing/shared";

/** Honest placeholder for legal pages until the real text is written. */
export function InfoPage({ kind }: { kind: "privacy" | "terms" }) {
  const copy = useLandingCopy();
  const title = kind === "privacy" ? copy.info.privacyTitle : copy.info.termsTitle;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" aria-label="Mizan">
          <MizanWordmark />
        </Link>
        <main className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.info.body}</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {copy.info.back}
          </Link>
        </main>
      </div>
    </div>
  );
}
