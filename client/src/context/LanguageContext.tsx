import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { LanguageCode } from "@mizan/shared";
import { TRANSLATIONS, type UiDictionary } from "../i18n/translations";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  applyAccountLanguage: (lang: LanguageCode) => void;
  t: UiDictionary;
}

const STORAGE_KEY = "mizan_preferred_lang";

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "am" || value === "om" || value === "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguageCode(saved) ? saved : "am";
  });
  const userSelectedLanguage = useRef(isLanguageCode(localStorage.getItem(STORAGE_KEY)));

  const writeLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      userSelectedLanguage.current = true;
      writeLanguage(lang);
    },
    [writeLanguage]
  );

  const applyAccountLanguage = useCallback(
    (lang: LanguageCode) => {
      if (userSelectedLanguage.current) return;
      writeLanguage(lang);
    },
    [writeLanguage]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        applyAccountLanguage,
        t: TRANSLATIONS[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
