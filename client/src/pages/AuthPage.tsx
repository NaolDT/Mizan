import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Scale, Sparkles } from "lucide-react";
import type { BusinessCategory, LanguageCode } from "@mizan/shared";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { REWARDS_TEXT } from "../i18n/rewardsText";
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

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  const { language, setLanguage, t } = useLanguage();
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopCategory, setShopCategory] = useState<BusinessCategory>("GROCERY");
  const [location, setLocation] = useState("");
  const [inviteCode, setInviteCode] = useState(
    (searchParams.get("ref") ?? "").trim().toUpperCase().slice(0, 24)
  );
  const rewardsText = REWARDS_TEXT[language];

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ identifier, password: loginPassword });
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({
        name: ownerName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        password: regPassword,
        businessName: shopName,
        businessCategory: shopCategory,
        location: location.trim() || undefined,
        preferredLanguage: language,
        referralCode: inviteCode.trim() || undefined,
      });
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await loginDemo();
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">{t.appName}</span>
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["am", "om", "en"] as LanguageCode[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  language === code
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600"
                }`}
              >
                {LANGUAGE_LABELS[code]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <button
            type="button"
            disabled={submitting}
            onClick={handleDemo}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{t.openDemoShop}</span>
          </button>

          <div className="my-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("login");
              }}
              className={`rounded-lg py-2 text-xs font-bold transition ${
                mode === "login"
                  ? "bg-white text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.signIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("register");
              }}
              className={`rounded-lg py-2 text-xs font-bold transition ${
                mode === "register"
                  ? "bg-white text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.registerShop}
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {t.identifierLabel}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+251911223344 / demo@mizan.et"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {t.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t.signIn}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {t.ownerNameLabel}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Abebe Kebede"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    {t.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0911223344"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    {t.emailLabel}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shop@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {t.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t.shopNameLabel}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Bole Fresh Grocery"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    {t.shopCategoryLabel}
                  </label>
                  <select
                    value={shopCategory}
                    onChange={(e) =>
                      setShopCategory(e.target.value as BusinessCategory)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
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
                    placeholder="Addis Ababa"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {rewardsText.inviteCodeLabel}
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="MIZAN-ABCD-1234"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs focus:border-emerald-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {rewardsText.inviteCodeHint}
                </p>
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t.registerShop}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
