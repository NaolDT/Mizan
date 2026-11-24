import { Coins } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { BILLING_TEXT, fill } from "../i18n/billingText";
import { creditDetails, isInsufficientCredits } from "../lib/api";

export function CreditGate({
  error,
  onBuyCredits,
  onRecordByHand,
}: {
  error: unknown;
  onBuyCredits?: () => void;
  onRecordByHand?: () => void;
}) {
  const { language } = useLanguage();
  const text = BILLING_TEXT[language];
  if (!isInsufficientCredits(error)) return null;

  const details = creditDetails(error);
  const available = details?.available ?? 0;
  const required = details?.required ?? 0;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
      <p className="flex items-center gap-1.5 font-bold">
        <Coins className="h-3.5 w-3.5" />
        {text.gateTitle}
      </p>
      <p className="mt-1 leading-relaxed">
        {fill(text.gateBody, { available, required })}
      </p>
      <p className="mt-1 text-amber-800">{text.gateManual}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {onBuyCredits && (
          <button
            type="button"
            onClick={onBuyCredits}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            {text.buyCredits}
          </button>
        )}
        {onRecordByHand && (
          <button
            type="button"
            onClick={onRecordByHand}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-800"
          >
            {text.recordByHand}
          </button>
        )}
      </div>
    </div>
  );
}
