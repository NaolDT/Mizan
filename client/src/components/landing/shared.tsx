import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { LANDING_COPY, type LandingCopy } from "../../i18n/landingText";

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export function useLandingCopy(): LandingCopy {
  const { language } = useLanguage();
  return LANDING_COPY[language];
}

/** Every call to action on the page goes through here so they stay consistent. */
export function useLandingActions() {
  const navigate = useNavigate();
  const { user, loginDemo } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(false);

  const goRegister = () => navigate(user ? "/app" : "/auth?mode=register");
  const goSignIn = () => navigate(user ? "/app" : "/auth");

  const openDemo = async () => {
    if (user) {
      navigate("/app");
      return;
    }
    setDemoLoading(true);
    setDemoError(false);
    try {
      await loginDemo();
      navigate("/app");
    } catch {
      setDemoError(true);
    } finally {
      setDemoLoading(false);
    }
  };

  return { user, goRegister, goSignIn, openDemo, demoLoading, demoError };
}

export function SectionHeading({
  title,
  subtitle,
  align = "center",
  tone = "light",
  as: Tag = "h2",
  id,
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  id?: string;
}) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-left";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <Tag
        id={id}
        className={`text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl ${
          tone === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </Tag>
      {subtitle && (
        <p
          className={`mt-3 text-sm leading-relaxed sm:text-base ${
            tone === "dark" ? "text-emerald-100" : "text-slate-600"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Marks demo figures so nobody mistakes them for real business results. */
export function IllustrativeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
      <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

export function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "emerald",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "emerald" | "white";
}) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-700"
      : "bg-white text-emerald-900 hover:bg-emerald-50 focus-visible:outline-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${colors}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  tone = "light",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "light" | "dark";
}) {
  const colors =
    tone === "light"
      ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline-emerald-700"
      : "border-emerald-700 bg-emerald-900/60 text-emerald-50 hover:bg-emerald-900 focus-visible:outline-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${colors}`}
    >
      {children}
    </button>
  );
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
