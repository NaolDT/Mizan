import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, Loader2 } from "lucide-react";
import type { BillingProviderCode, SubscriptionPlan } from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import {
  useCancelPlan,
  useCheckout,
  useSimulateDevPayment,
  useVerifyPayment,
  useWallet,
} from "../hooks/useWallet";
import { BILLING_TEXT, fill } from "../i18n/billingText";
import { apiRequest } from "../lib/api";
import { formatShortDate } from "../lib/format";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function WalletPanel() {
  const { language } = useLanguage();
  const text = BILLING_TEXT[language];
  const wallet = useWallet();
  const checkout = useCheckout();
  const verify = useVerifyPayment();
  const simulate = useSimulateDevPayment();
  const cancel = useCancelPlan();
  const [params] = useSearchParams();
  const [note, setNote] = useState<string | null>(null);
  const txRef = params.get("txRef");
  const billingMode = params.get("billing");

  useEffect(() => {
    if (!txRef || (billingMode !== "return" && billingMode !== "dev")) return;
    verify.mutate(txRef, {
      onSuccess: (payment) => {
        if (payment.status === "PAID") setNote(text.paid);
        else if (payment.status === "FAILED" || payment.status === "CANCELLED") setNote(text.failed);
        else setNote(text.pending);
      },
    });
    // Verify once when returning from checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txRef, billingMode]);

  useEffect(() => {
    if (!wallet.data || wallet.data.notices.length === 0) return;
    void apiRequest("/billing/notices/read", { method: "POST" }).catch(() => undefined);
  }, [wallet.data]);

  if (wallet.isLoading || !wallet.data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const data = wallet.data;
  const dev = data.providers.some((provider) => provider.code === "DEV");

  const pay = (purpose: "SUBSCRIPTION" | "TOPUP", provider: BillingProviderCode, extra: { plan?: SubscriptionPlan; packageCode?: string }) => {
    checkout.mutate(
      { purpose, provider, ...extra },
      {
        onSuccess: (result) => {
          window.location.assign(result.checkoutUrl);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <Coins className="h-4 w-4" />
          <h2 className="text-sm font-bold">{text.title}</h2>
        </div>
        <p className="mt-3 text-4xl font-bold text-slate-900">{data.total}</p>
        <p className="text-xs text-slate-500">{text.remaining}</p>
        {data.expiringWithin7Days > 0 && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            {fill(text.expiring, { n: data.expiringWithin7Days })}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {data.balances.map((row) => (
            <div key={row.source} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">{text.sources[row.source]}</p>
              <p className="text-sm font-bold text-slate-900">{row.remaining}</p>
            </div>
          ))}
        </div>
        {data.subscription.paidUntil && (
          <p className="mt-3 text-xs text-slate-600">
            {fill(text.paidUntil, { date: formatShortDate(data.subscription.paidUntil) })}
          </p>
        )}
        {data.subscription.status === "CANCEL_SCHEDULED" && data.subscription.paidUntil && (
          <p className="mt-1 text-xs text-amber-700">
            {fill(text.cancelScheduled, { date: formatShortDate(data.subscription.paidUntil) })}
          </p>
        )}
        {data.subscription.plan !== "FREE" && data.subscription.status !== "CANCEL_SCHEDULED" && (
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="mt-3 text-xs font-semibold text-slate-500 underline"
          >
            {text.cancelPlan}
          </button>
        )}
      </section>

      {data.notices.length > 0 && (
        <div className="space-y-2">
          {data.notices.map((notice) => (
            <p key={notice.id} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {fill(text.notices[notice.kind] ?? notice.kind, { n: notice.amount ?? 0 })}
            </p>
          ))}
        </div>
      )}

      {(note || verify.isPending) && (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
          {verify.isPending ? text.checking : note}
        </p>
      )}
      {checkout.error && <p className="text-xs text-rose-600">{errorMessage(checkout.error)}</p>}

      {billingMode === "dev" && txRef && dev && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-900">{text.devTitle}</h3>
          <p className="mt-1 text-xs text-amber-800">{text.devBody}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["success", text.devSuccess],
                ["failed", text.devFail],
                ["cancelled", text.devCancel],
                ["pending", text.devPending],
              ] as const
            ).map(([outcome, label]) => (
              <button
                key={outcome}
                type="button"
                disabled={simulate.isPending}
                onClick={() =>
                  simulate.mutate(
                    { txRef, outcome },
                    {
                      onSuccess: (payment) => {
                        if (payment.status === "PAID") setNote(text.paid);
                        else if (payment.status === "FAILED" || payment.status === "CANCELLED") setNote(text.failed);
                        else setNote(text.pending);
                      },
                    }
                  )
                }
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">{text.buyTitle}</h3>
        {data.subscriptionSavingsPct != null && data.subscriptionSavingsPct > 0 && (
          <p className="mt-2 text-xs text-emerald-800">
            {fill(text.savings, { pct: data.subscriptionSavingsPct })}
          </p>
        )}
        {data.suggestedPlan && (
          <p className="mt-2 text-xs text-slate-600">
            {fill(text.suggest, {
              amount: data.topUpSpendThisMonthEtb,
              plan: text.planNames[data.suggestedPlan] ?? data.suggestedPlan,
            })}
          </p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.packages.map((pack) => (
            <article key={pack.code} className="flex flex-col rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-bold text-slate-900">{text.packageNames[pack.code] ?? pack.name}</h4>
              <p className="mt-1 text-xs text-slate-500">{text.packageDescriptions[pack.code] ?? pack.description}</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{pack.priceEtb} ETB</p>
              <p className="text-xs text-slate-600">{fill(text.credits, { n: pack.totalCredits })}</p>
              {pack.bonusCredits > 0 && (
                <p className="text-xs text-emerald-700">{fill(text.bonus, { n: pack.bonusCredits })}</p>
              )}
              <p className="text-xs text-slate-500">{fill(text.validDays, { n: pack.validityDays })}</p>
              <p className="text-xs text-slate-500">{fill(text.perCredit, { price: pack.etbPerCredit.toFixed(2) })}</p>
              <div className="mt-3 flex flex-col gap-1">
                {data.providers.map((provider) => (
                  <button
                    key={provider.code}
                    type="button"
                    disabled={checkout.isPending}
                    onClick={() => pay("TOPUP", provider.code, { packageCode: pack.code })}
                    className="rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {fill(text.payWith, { name: provider.name })}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
        {data.providers.length === 0 && <p className="mt-3 text-xs text-slate-500">{text.noProviders}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">{text.plansTitle}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.plans.map((plan) => {
            const current = plan.plan === data.subscription.plan;
            return (
              <article
                key={plan.plan}
                className={`flex flex-col rounded-xl border p-3 ${current ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200"}`}
              >
                <h4 className="text-sm font-bold text-slate-900">{text.planNames[plan.plan] ?? plan.name}</h4>
                <p className="mt-1 text-xs text-slate-500">{text.planDescriptions[plan.plan] ?? plan.description}</p>
                <p className="mt-2 text-sm font-semibold">
                  {plan.priceEtb === 0 ? text.free : fill(text.perMonth, { price: plan.priceEtb })}
                </p>
                <p className="text-xs text-slate-600">{fill(text.credits, { n: plan.monthlyCredits })}</p>
                {plan.etbPerCredit != null && (
                  <p className="text-xs text-slate-500">{fill(text.perCredit, { price: plan.etbPerCredit.toFixed(2) })}</p>
                )}
                {current ? (
                  <p className="mt-3 text-xs font-bold text-emerald-700">{text.current}</p>
                ) : (
                  plan.priceEtb > 0 &&
                  data.providers.map((provider) => (
                    <button
                      key={provider.code}
                      type="button"
                      disabled={checkout.isPending}
                      onClick={() => pay("SUBSCRIPTION", provider.code, { plan: plan.plan })}
                      className="mt-2 rounded-lg bg-slate-900 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {fill(text.payWith, { name: provider.name })}
                    </button>
                  ))
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">{text.manualNote}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">{text.pricesTitle}</h3>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {data.prices.map((price) => (
            <li key={price.feature} className="flex justify-between text-xs text-slate-600">
              <span>{text.features[price.feature]}</span>
              <span className="font-semibold">{price.credits}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">{text.history}</h3>
        {data.ledger.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">{text.emptyHistory}</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="text-slate-600">
                  {entry.description}
                  <span className="mt-0.5 block text-[11px] text-slate-400">{formatShortDate(entry.createdAt)}</span>
                </span>
                <span className={entry.amount < 0 ? "font-bold text-rose-600" : "font-bold text-emerald-700"}>
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
