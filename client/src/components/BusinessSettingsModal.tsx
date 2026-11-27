import { useState } from "react";
import { X } from "lucide-react";
import type { BusinessCategory, LanguageCode } from "@mizan/shared";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { CUSTOMERS_INTEL_TEXT } from "../i18n/customersText";
import { LANGUAGE_LABELS } from "../i18n/translations";

const BUSINESS_CATEGORIES: BusinessCategory[] = [
  "GROCERY",
  "RETAIL",
  "CAFE_RESTAURANT",
  "TRADER",
  "WHOLESALE",
  "SERVICE",
  "OTHER",
];

export function BusinessSettingsModal({ onClose }: { onClose: () => void }) {
  const { business, updateBusiness } = useAuth();
  const { t, language } = useLanguage();
  const intel = CUSTOMERS_INTEL_TEXT[language];

  const [name, setName] = useState(business?.name ?? "");
  const [category, setCategory] = useState<BusinessCategory>(
    business?.category ?? "GROCERY"
  );
  const [location, setLocation] = useState(business?.location ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(
    business?.preferredLanguage ?? "am"
  );
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(business?.loyaltyEnabled ?? true);
  const [loyaltyEtbPerPoint, setLoyaltyEtbPerPoint] = useState(
    String(business?.loyaltyEtbPerPoint ?? 100)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateBusiness({
        name: name.trim(),
        category,
        location: location.trim() || null,
        preferredLanguage,
        loyaltyEnabled,
        loyaltyEtbPerPoint: Number(loyaltyEtbPerPoint),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">{t.shopSettings}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.shopNameLabel}
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.shopCategoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BusinessCategory)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.businessCategories[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.locationLabel}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Merkato, Addis Ababa"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              {t.preferredLangLabel}
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              {(["am", "om", "en"] as LanguageCode[]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={loyaltyEnabled}
              onChange={(e) => setLoyaltyEnabled(e.target.checked)}
            />
            {intel.loyaltyEnabled}
          </label>
          {loyaltyEnabled && (
            <div>
              <label className="block text-xs font-medium text-slate-700">{intel.loyaltyRule}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={loyaltyEtbPerPoint}
                onChange={(e) => setLoyaltyEtbPerPoint(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.cancelAction}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "..." : t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
