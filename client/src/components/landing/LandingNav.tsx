import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Menu, X } from "lucide-react";
import type { LanguageCode } from "@mizan/shared";
import { useLanguage } from "../../context/LanguageContext";
import { LANGUAGE_LABELS } from "../../i18n/translations";
import { MizanWordmark } from "../brand/MizanLogo";
import { CONTAINER, scrollToId, useLandingActions, useLandingCopy } from "./shared";

const LANGUAGES: LanguageCode[] = ["en", "am", "om"];

function LanguageMenu() {
  const { language, setLanguage } = useLanguage();
  const copy = useLandingCopy();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${copy.nav.language}: ${LANGUAGE_LABELS[language]}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <Globe2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        <span className="max-w-[6.5rem] truncate">{LANGUAGE_LABELS[language]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={copy.nav.language}
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {LANGUAGES.map((code) => (
            <li key={code} role="option" aria-selected={language === code}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  language === code ? "font-bold text-emerald-700" : "text-slate-700"
                }`}
              >
                <span>{LANGUAGE_LABELS[code]}</span>
                {language === code && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LandingNav() {
  const copy = useLandingCopy();
  const { user, goRegister, goSignIn } = useLandingActions();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { id: "home", label: copy.nav.home },
    { id: "features", label: copy.nav.features },
    { id: "how-it-works", label: copy.nav.how },
    { id: "businesses", label: copy.nav.businesses },
    { id: "about", label: copy.nav.about },
  ];

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const go = (id: string) => {
    setMenuOpen(false);
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      scrollToId(id);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className={`${CONTAINER} flex items-center justify-between gap-3 py-3`}>
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
          aria-label="Mizan"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <MizanWordmark />
        </a>

        <nav aria-label={copy.nav.mainNav} className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(link.id);
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageMenu />

          <button
            type="button"
            onClick={goSignIn}
            className="hidden rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:inline-flex"
          >
            {user ? copy.nav.dashboard : copy.nav.signIn}
          </button>
          <button
            type="button"
            onClick={goRegister}
            className="hidden rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:inline-flex"
          >
            {user ? copy.nav.dashboard : copy.nav.getStarted}
          </button>

          <button
            type="button"
            aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-slate-100 bg-white lg:hidden">
          <nav aria-label={copy.nav.mainNav} className={`${CONTAINER} flex flex-col gap-1 py-3`}>
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(link.id);
                }}
                className="rounded-lg px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={goSignIn}
                className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-800"
              >
                {user ? copy.nav.dashboard : copy.nav.signIn}
              </button>
              <button
                type="button"
                onClick={goRegister}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
              >
                {user ? copy.nav.dashboard : copy.nav.getStarted}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
