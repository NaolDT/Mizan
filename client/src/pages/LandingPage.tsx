import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  Loader2,
  Mic,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { LanguageCode } from "@mizan/shared";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGE_LABELS } from "../i18n/translations";

export function LandingPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleOpenDemo = async () => {
    if (user) {
      navigate("/app");
      return;
    }
    setDemoLoading(true);
    setDemoError(null);
    try {
      await loginDemo();
      navigate("/app");
    } catch (err) {
      setDemoError(
        err instanceof Error
          ? err.message
          : "Could not start demo shop. Ensure PostgreSQL & server are running."
      );
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                {t.appName}
              </span>
              <p className="hidden text-xs text-slate-500 sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {(["am", "om", "en"] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    language === code
                      ? "bg-white text-emerald-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(user ? "/app" : "/auth")}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              {user ? t.dashboardTab : t.signIn}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Globe2 className="h-3.5 w-3.5" />
              <span>አማርኛ · Afaan Oromoo · English</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {t.heroTitle}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {t.heroSubtitle}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={demoLoading}
                onClick={handleOpenDemo}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>{t.openDemoShop}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/auth?mode=register")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
              >
                <span>{t.getStarted}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {demoError && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                {demoError}
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Mic className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  Voice-First Entry
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Speak naturally in Amharic or Afaan Oromo to record daily shop sales & expenses.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  Safe Confirmation Gate
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Every voice entry shows a clear preview card before touching your financial ledger.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  Exact ETB Profit Math
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  100% deterministic backend calculations—zero AI guesswork on your money.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-700">
                  Merkato Mini-Mart · ETB
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  Live Voice Example
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="ml-auto max-w-[85%] rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-white">
                  <p className="font-medium">
                    "ዛሬ ከዱቄት እና ዘይት ሽያጭ 3,500 ብር አግኝቻለሁ"
                  </p>
                </div>

                <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-slate-800">
                  <p>
                    ዛሬ 3,500.00 ETB የሽያጭ ገቢ ለመመዝገብ ዝግጁ ነኝ። ትክክል ከሆነ ያጽድቁት።
                  </p>
                  <div className="mt-2.5 rounded-xl border border-emerald-300 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-700">
                        +3,500.00 ETB
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ሽያጭ (Sales)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-auto max-w-[85%] rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-white">
                  <p className="font-medium">
                    "Geejjibaaf qarshii 450 baaseera"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
