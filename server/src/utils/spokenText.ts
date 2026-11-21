import type { LanguageCode } from "@mizan/shared";

const AM_ONES = ["ዜሮ", "አንድ", "ሁለት", "ሶስት", "አራት", "አምስት", "ስድስት", "ሰባት", "ስምንት", "ዘጠኝ"];
const AM_TENS = ["", "አስር", "ሃያ", "ሰላሳ", "አርባ", "ሃምሳ", "ስድሳ", "ሰባ", "ሰማንያ", "ዘጠና"];
const AM_TEENS = ["አስር", "አስራ አንድ", "አስራ ሁለት", "አስራ ሶስት", "አስራ አራት", "አስራ አምስት", "አስራ ስድስት", "አስራ ሰባት", "አስራ ስምንት", "አስራ ዘጠኝ"];

const OM_ONES = ["zeeroo", "tokko", "lama", "sadii", "afur", "shan", "ja'a", "torba", "saddeet", "sagal"];
const OM_TENS = ["", "kudhan", "digdama", "soddoma", "afurtama", "shantama", "jaatama", "torbaatama", "saddeettama", "sagaltama"];
const OM_TEENS = ["kudhan", "kudha tokko", "kudha lama", "kudha sadii", "kudha afur", "kudha shan", "kudha ja'a", "kudha torba", "kudha saddeet", "kudha sagal"];

function intToAmharicWords(n: number): string {
  if (n === 0) return AM_ONES[0];
  if (n < 0) return `አሉታዊ ${intToAmharicWords(Math.abs(n))}`;
  if (n < 10) return AM_ONES[n];
  if (n < 20) return AM_TEENS[n - 10];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rem = n % 10;
    return rem === 0 ? AM_TENS[ten] : `${AM_TENS[ten]} ${AM_ONES[rem]}`;
  }
  if (n < 1000) {
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    const prefix = `${AM_ONES[hundred]} መቶ`;
    return rem === 0 ? prefix : `${prefix} ${intToAmharicWords(rem)}`;
  }
  if (n < 1_000_000) {
    const thousand = Math.floor(n / 1000);
    const rem = n % 1000;
    const prefix = `${intToAmharicWords(thousand)} ሺህ`;
    return rem === 0 ? prefix : `${prefix} ${intToAmharicWords(rem)}`;
  }
  const million = Math.floor(n / 1_000_000);
  const rem = n % 1_000_000;
  const prefix = `${intToAmharicWords(million)} ሚሊዮን`;
  return rem === 0 ? prefix : `${prefix} ${intToAmharicWords(rem)}`;
}

function intToOromoWords(n: number): string {
  if (n === 0) return OM_ONES[0];
  if (n < 0) return `hir'isaa ${intToOromoWords(Math.abs(n))}`;
  if (n < 10) return OM_ONES[n];
  if (n < 20) return OM_TEENS[n - 10];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rem = n % 10;
    return rem === 0 ? OM_TENS[ten] : `${OM_TENS[ten]} fi ${OM_ONES[rem]}`;
  }
  if (n < 1000) {
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    const prefix = hundred === 1 ? "dhibba tokko" : `dhibba ${OM_ONES[hundred]}`;
    return rem === 0 ? prefix : `${prefix} fi ${intToOromoWords(rem)}`;
  }
  if (n < 1_000_000) {
    const thousand = Math.floor(n / 1000);
    const rem = n % 1000;
    const prefix = `kuma ${intToOromoWords(thousand)}`;
    return rem === 0 ? prefix : `${prefix} fi ${intToOromoWords(rem)}`;
  }
  const million = Math.floor(n / 1_000_000);
  const rem = n % 1_000_000;
  const prefix = `miliyoona ${intToOromoWords(million)}`;
  return rem === 0 ? prefix : `${prefix} fi ${intToOromoWords(rem)}`;
}

/**
 * Replaces raw digit sequences (e.g. "2,500.00" or "2500") and "ETB" inside
 * `spokenText` with spoken words in Amharic or Afaan Oromo so VITS / Neural TTS
 * never skips or mispronounces monetary figures.
 */
export function normalizeSpokenText(rawText: string, language: LanguageCode): string {
  if (!rawText) return "";

  if (language === "en") {
    return rawText.replace(/\bETB\b/g, "Ethiopian birr");
  }

  const currencyWord = language === "am" ? "ብር" : "qarshii";
  let cleaned = rawText.replace(/\bETB\b/gi, currencyWord);

  cleaned = cleaned.replace(/\d[\d,]*(?:\.\d+)?/g, (match) => {
    const numeric = Number(match.replace(/,/g, ""));
    if (!Number.isFinite(numeric)) return match;
    const whole = Math.round(numeric);
    return language === "am" ? intToAmharicWords(whole) : intToOromoWords(whole);
  });

  return cleaned.replace(/\s+/g, " ").trim();
}
